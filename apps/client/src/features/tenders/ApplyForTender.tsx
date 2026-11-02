import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { apiCall, API_ENDPOINTS } from '../../config/api'
import { normalizeProfile } from '../professionalProfile/normalize'
import ProfessionalProfileModal from '../professionalProfile/ProfessionalProfileModal'
import type { ProfessionalProfile, RawProfessionalProfile } from '../professionalProfile/types'
import type { Applicant, Tender } from './types'

interface Props {
  tender: Tender
  onSubmit: (applicant: Applicant) => void
  onCancel: () => void
}

type FormErrors = Partial<Record<'name' | 'email' | 'details' | 'proposal' | 'contactMethod' | 'resumeFile' | 'portfolioLink', string>>

const INPUT_LIMITS = {
  name: 50,
  email: 254,
  details: 500,
  contactMethod: 50,
  portfolioLink: 500,
} as const

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_REGEX = /^https?:\/\/.+/i
const RESUME_MAX_SIZE_BYTES = 5 * 1024 * 1024
const RESUME_ALLOWED_TYPE = 'application/pdf'

type ApplicationMode = 'profile' | 'manual'

export default function ApplyForTender({ tender, onSubmit, onCancel }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  const [proposal, setProposal] = useState<number | undefined>(undefined)
  const [contactMethod, setContactMethod] = useState('')
  const [portfolioLink, setPortfolioLink] = useState('')
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const [profile, setProfile] = useState<ProfessionalProfile | null>(null)
  const [applicationMode, setApplicationMode] = useState<ApplicationMode>('manual')
  const [selectedResumeKey, setSelectedResumeKey] = useState('')
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false)

  useEffect(() => {
    apiCall<RawProfessionalProfile | null>(API_ENDPOINTS.professionalProfile.me)
      .then((raw) => {
        const loadedProfile = raw ? normalizeProfile(raw) : null
        setProfile(loadedProfile)
        if (loadedProfile) {
          setApplicationMode('profile')
        }
      })
      .catch((error) => console.error('Failed to load professional profile', error))
  }, [])

  const usingProfile = applicationMode === 'profile' && profile !== null

  const validateForm = () => {
    const nextErrors: FormErrors = {}

    if (!usingProfile) {
      const trimmedName = name.trim()
      if (!trimmedName) {
        nextErrors.name = t('tenders.apply.errors.nameRequired')
      } else if (trimmedName.length > INPUT_LIMITS.name) {
        nextErrors.name = t('tenders.apply.errors.nameTooLong', { max: INPUT_LIMITS.name })
      }
    }

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      nextErrors.email = t('tenders.apply.errors.emailRequired')
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = t('tenders.apply.errors.emailInvalid')
    } else if (trimmedEmail.length > INPUT_LIMITS.email) {
      nextErrors.email = t('tenders.apply.errors.emailTooLong', { max: INPUT_LIMITS.email })
    }

    if (!usingProfile) {
      const trimmedDetails = details.trim()
      if (!trimmedDetails) {
        nextErrors.details = t('tenders.apply.errors.detailsRequired')
      } else if (trimmedDetails.length > INPUT_LIMITS.details) {
        nextErrors.details = t('tenders.apply.errors.detailsTooLong', { max: INPUT_LIMITS.details })
      }
    }

    if (proposal !== undefined && proposal < 0) {
      nextErrors.proposal = t('tenders.apply.errors.proposalPositive')
    }

    const trimmedContactMethod = contactMethod.trim()
    if (trimmedContactMethod && trimmedContactMethod.length > INPUT_LIMITS.contactMethod) {
      nextErrors.contactMethod = t('tenders.apply.errors.contactMethodTooLong', { max: INPUT_LIMITS.contactMethod })
    }

    const trimmedPortfolioLink = portfolioLink.trim()
    if (trimmedPortfolioLink) {
      if (trimmedPortfolioLink.length > INPUT_LIMITS.portfolioLink) {
        nextErrors.portfolioLink = t('tenders.apply.errors.portfolioLinkTooLong', { max: INPUT_LIMITS.portfolioLink })
      } else if (!URL_REGEX.test(trimmedPortfolioLink)) {
        nextErrors.portfolioLink = t('tenders.apply.errors.portfolioLinkInvalid')
      }
    }

    if (resumeFile) {
      if (resumeFile.type !== RESUME_ALLOWED_TYPE) {
        nextErrors.resumeFile = t('tenders.apply.errors.resumePdfOnly')
      } else if (resumeFile.size > RESUME_MAX_SIZE_BYTES) {
        nextErrors.resumeFile = t('tenders.apply.errors.resumeTooLarge')
      }
    }

    setErrors(nextErrors)
    return nextErrors
  }

  const handleFileChange = (file: File | null) => {
    setResumeFile(file)
    if (errors.resumeFile) {
      setErrors((prev) => ({ ...prev, resumeFile: undefined }))
    }
  }

  const uploadResume = async (file: File): Promise<string> => {
    const { uploadUrl, fileUrl } = await apiCall<{ uploadUrl: string; fileUrl: string }>(
      API_ENDPOINTS.upload.getUrl,
      {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          context: 'tenderResume',
        }),
      },
    )

    const awsResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!awsResponse.ok) {
      throw new Error('Uploading the resume file to S3 failed')
    }

    return fileUrl
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSubmitting) return

    const nextErrors = validateForm()
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)

    let resumeFileKey: string | undefined
    if (usingProfile && selectedResumeKey) {
      resumeFileKey = selectedResumeKey
    } else if (!usingProfile && resumeFile) {
      try {
        resumeFileKey = await uploadResume(resumeFile)
      } catch (error) {
        console.error('Failed to upload resume file', error)
        setErrors((prev) => ({ ...prev, resumeFile: t('tenders.apply.errors.resumeUploadFailed') }))
        setIsSubmitting(false)
        return
      }
    }

    const effectiveName = usingProfile && profile ? profile.name : name.trim()
    const effectiveDetails = usingProfile && profile ? (profile.description || profile.experience || '') : details.trim()
    const effectivePortfolioLink = usingProfile && profile ? (profile.portfolioLink || portfolioLink.trim() || undefined) : (portfolioLink.trim() || undefined)

    onSubmit({
      name: effectiveName,
      email: email.trim(),
      details: effectiveDetails,
      proposal: proposal !== undefined ? proposal : undefined,
      contactMethod: contactMethod.trim() || undefined,
      resumeFileKey,
      portfolioLink: effectivePortfolioLink,
      professionalProfileId: usingProfile && profile ? profile.id : undefined,
    })

    setIsSubmitting(false)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>{t('tenders.applyToTenderLabel')}</h2>
            <p>{tender.title}</p>
          </div>
          <div>
            <button type="button" className="tab-button" onClick={onCancel}>
              {t('common.close')}
            </button>
          </div>
        </header>

        <form className="modal-section apply-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {profile && (
              <div className="form-field form-full">
                <div className="profile-attach-box">
                  <label className="profile-attach-checkbox">
                    <input
                      type="radio"
                      name="applicationMode"
                      checked={applicationMode === 'profile'}
                      onChange={() => setApplicationMode('profile')}
                    />
                    {t('tenders.apply.useMyProfile', { name: profile.name })}
                  </label>
                  <label className="profile-attach-checkbox">
                    <input
                      type="radio"
                      name="applicationMode"
                      checked={applicationMode === 'manual'}
                      onChange={() => setApplicationMode('manual')}
                    />
                    {t('tenders.apply.fillManually')}
                  </label>

                  {usingProfile && profile.resumeFiles.length > 0 && (
                    <select
                      className="form-input"
                      value={selectedResumeKey}
                      onChange={(e) => setSelectedResumeKey(e.target.value)}
                    >
                      <option value="">{t('tenders.apply.chooseResumeOptional')}</option>
                      {profile.resumeFiles.map((file) => (
                        <option key={file.fileKey} value={file.fileKey}>
                          {file.fileName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            {!profile && (
              <div className="form-field form-full">
                <div className="profile-attach-box no-profile-banner">
                  <p>{t('tenders.apply.noProfileMessage')}</p>
                  <button type="button" className="secondary-button" onClick={() => setShowCreateProfileModal(true)}>
                    {t('tenders.apply.createProfileBtn')}
                  </button>
                </div>
              </div>
            )}

            {!usingProfile && (
              <label className="form-field">
                <span className="form-label">{t('tenders.nameLabel')}</span>
                <input
                  className="form-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: undefined }))
                    }
                  }}
                  placeholder={t('tenders.namePlaceholder')}
                  maxLength={INPUT_LIMITS.name}
                  required
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </label>
            )}

            <label className="form-field">
              <span className="form-label">{t('tenders.emailLabel')}</span>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: undefined }))
                  }
                }}
                placeholder="example@mail.com"
                maxLength={INPUT_LIMITS.email}
                required
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </label>

            {!usingProfile && (
              <label className="form-field form-full">
                <span className="form-label">{t('tenders.detailsLabel')}</span>
                <textarea
                  className="form-textarea"
                  value={details}
                  onChange={(e) => {
                    setDetails(e.target.value)
                    if (errors.details) {
                      setErrors((prev) => ({ ...prev, details: undefined }))
                    }
                  }}
                  placeholder={t('tenders.detailsPlaceholder')}
                  maxLength={INPUT_LIMITS.details}
                  required
                  rows={5}
                />
                {errors.details && <span className="form-error">{errors.details}</span>}
              </label>
            )}

            <label className="form-field">
              <span className="form-label">{t('tenders.proposalLabel')}</span>
              <input
                className="form-input"
                type="number"
                value={proposal ?? ''}
                onChange={(e) => {
                  const nextValue = e.target.value === '' ? undefined : Number(e.target.value)
                  setProposal(nextValue)
                  if (errors.proposal) {
                    setErrors((prev) => ({ ...prev, proposal: undefined }))
                  }
                }}
                placeholder={t('tenders.proposalPlaceholder')}
                min="0"
                max="999999999"
                inputMode="numeric"
              />
              {errors.proposal && <span className="form-error">{errors.proposal}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">{t('tenders.contactMethodLabel')}</span>
              <input
                className="form-input"
                type="text"
                value={contactMethod}
                onChange={(e) => {
                  setContactMethod(e.target.value)
                  if (errors.contactMethod) {
                    setErrors((prev) => ({ ...prev, contactMethod: undefined }))
                  }
                }}
                placeholder={t('tenders.contactMethodPlaceholder')}
                maxLength={INPUT_LIMITS.contactMethod}
              />
              {errors.contactMethod && <span className="form-error">{errors.contactMethod}</span>}
            </label>

            {!usingProfile && (
              <label className="form-field">
                <span className="form-label">{t('tenders.apply.resumeLabel')}</span>
                <input
                  className="form-input"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
                {errors.resumeFile && <span className="form-error">{errors.resumeFile}</span>}
              </label>
            )}

            {!usingProfile && (
              <label className="form-field">
                <span className="form-label">{t('tenders.apply.portfolioLinkLabel')}</span>
                <input
                  className="form-input"
                  type="url"
                  value={portfolioLink}
                  onChange={(e) => {
                    setPortfolioLink(e.target.value)
                    if (errors.portfolioLink) {
                      setErrors((prev) => ({ ...prev, portfolioLink: undefined }))
                    }
                  }}
                  placeholder="https://..."
                  maxLength={INPUT_LIMITS.portfolioLink}
                />
                {errors.portfolioLink && <span className="form-error">{errors.portfolioLink}</span>}
              </label>
            )}
          </div>

          <div className="modal-actions mt-18 actions-row">
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? t('tenders.apply.submitting') : t('tenders.submitApplicationBtn')}
            </button>
            <button type="button" className="secondary-button" onClick={onCancel} disabled={isSubmitting}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>

      {showCreateProfileModal && (
        <ProfessionalProfileModal
          profile={null}
          onClose={() => setShowCreateProfileModal(false)}
          onSaved={(savedProfile) => {
            setProfile(savedProfile)
            setApplicationMode('profile')
            setShowCreateProfileModal(false)
          }}
        />
      )}
    </div>
  )
}
