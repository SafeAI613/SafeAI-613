import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../../i18n/useLocale'
import { apiCall, API_ENDPOINTS } from '../../config/api'
import { normalizeProfile } from './normalize'
import type { ProfessionalProfile, RawProfessionalProfile, ResumeFile } from './types'

interface Props {
  profile: ProfessionalProfile | null
  onClose: () => void
  onSaved: (profile: ProfessionalProfile) => void
}

type FormErrors = Partial<Record<'name' | 'description' | 'experience' | 'portfolioLink' | 'resumeFile', string>>

const INPUT_LIMITS = {
  name: 50,
  description: 1000,
  experience: 1000,
  portfolioLink: 500,
} as const

const URL_REGEX = /^https?:\/\/.+/i
const RESUME_MAX_SIZE_MB = 5
const RESUME_MAX_SIZE_BYTES = RESUME_MAX_SIZE_MB * 1024 * 1024
const RESUME_ALLOWED_TYPE = 'application/pdf'
const MAX_RESUME_FILES = 6

export default function ProfessionalProfileModal({ profile, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const { dir } = useLocale()
  const [name, setName] = useState(profile?.name ?? '')
  const [description, setDescription] = useState(profile?.description ?? '')
  const [experience, setExperience] = useState(profile?.experience ?? '')
  const [portfolioLink, setPortfolioLink] = useState(profile?.portfolioLink ?? '')
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>(profile?.resumeFiles ?? [])
  // קבצים שנבחרו לפני שהפרופיל נשמר בשרת בפעם הראשונה - מועלים בפועל רק
  // אחרי יצירת הפרופיל, כדי שלא יהיה צורך לשמור קודם ורק אז לבחור קבצים
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  // עוקב אחרי הפרופיל שנשמר בפועל, כדי לדעת אם קיימת כבר רשומה בשרת
  const [savedProfile, setSavedProfile] = useState<ProfessionalProfile | null>(profile)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingResume, setIsUploadingResume] = useState(false)

  const validateForm = () => {
    const nextErrors: FormErrors = {}

    const trimmedName = name.trim()
    if (!trimmedName) {
      nextErrors.name = t('professionalProfile.modal.errors.nameRequired')
    } else if (trimmedName.length > INPUT_LIMITS.name) {
      nextErrors.name = t('professionalProfile.modal.errors.nameTooLong', { max: INPUT_LIMITS.name })
    }

    if (description.trim().length > INPUT_LIMITS.description) {
      nextErrors.description = t('professionalProfile.modal.errors.descriptionTooLong', { max: INPUT_LIMITS.description })
    }

    if (experience.trim().length > INPUT_LIMITS.experience) {
      nextErrors.experience = t('professionalProfile.modal.errors.experienceTooLong', { max: INPUT_LIMITS.experience })
    }

    const trimmedPortfolioLink = portfolioLink.trim()
    if (trimmedPortfolioLink) {
      if (trimmedPortfolioLink.length > INPUT_LIMITS.portfolioLink) {
        nextErrors.portfolioLink = t('professionalProfile.modal.errors.portfolioTooLong', { max: INPUT_LIMITS.portfolioLink })
      } else if (!URL_REGEX.test(trimmedPortfolioLink)) {
        nextErrors.portfolioLink = t('professionalProfile.modal.errors.portfolioInvalid')
      }
    }

    setErrors(nextErrors)
    return nextErrors
  }

  const uploadAndRegisterResume = async (file: File): Promise<ResumeFile[]> => {
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
      throw new Error(t('professionalProfile.modal.errors.s3Failed'))
    }

    const response = await apiCall<{ success: boolean; profile: RawProfessionalProfile }>(
      API_ENDPOINTS.professionalProfile.addResume,
      {
        method: 'POST',
        body: JSON.stringify({ fileKey: fileUrl, fileName: file.name }),
      },
    )

    return response.profile.resumeFiles ?? []
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return

    const nextErrors = validateForm()
    if (Object.keys(nextErrors).length > 0) return

    setIsSaving(true)

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      experience: experience.trim() || undefined,
      portfolioLink: portfolioLink.trim() || undefined,
    }

    try {
      const response = savedProfile
        ? await apiCall<{ success: boolean; profile: RawProfessionalProfile }>(
            API_ENDPOINTS.professionalProfile.update,
            { method: 'PUT', body: JSON.stringify(payload) },
          )
        : await apiCall<{ success: boolean; profile: RawProfessionalProfile }>(
            API_ENDPOINTS.professionalProfile.create,
            { method: 'POST', body: JSON.stringify(payload) },
          )

      const saved = normalizeProfile(response.profile)
      setSavedProfile(saved)
      onSaved(saved)

      if (pendingFiles.length > 0) {
        setIsUploadingResume(true)
        try {
          let latestResumeFiles = saved.resumeFiles
          for (const file of pendingFiles) {
            latestResumeFiles = await uploadAndRegisterResume(file)
          }
          setResumeFiles(latestResumeFiles)
          setPendingFiles([])
        } catch (uploadError) {
          console.error('Failed to upload pending resume files', uploadError)
          setErrors((prev) => ({ ...prev, resumeFile: t('professionalProfile.modal.errors.pendingUploadFailed') }))
        } finally {
          setIsUploadingResume(false)
        }
      }
    } catch (error) {
      console.error('Failed to save professional profile', error)
      setErrors((prev) => ({ ...prev, name: t('professionalProfile.modal.errors.saveFailed') }))
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileSelect = async (file: File | null) => {
    if (!file) return

    const currentCount = resumeFiles.length + pendingFiles.length
    if (currentCount >= MAX_RESUME_FILES) {
      setErrors((prev) => ({ ...prev, resumeFile: t('professionalProfile.modal.errors.maxFiles', { max: MAX_RESUME_FILES }) }))
      return
    }
    if (file.type !== RESUME_ALLOWED_TYPE) {
      setErrors((prev) => ({ ...prev, resumeFile: t('professionalProfile.modal.errors.pdfOnly') }))
      return
    }
    if (file.size > RESUME_MAX_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, resumeFile: t('professionalProfile.modal.errors.tooLarge', { max: RESUME_MAX_SIZE_MB }) }))
      return
    }

    setErrors((prev) => ({ ...prev, resumeFile: undefined }))

    if (!savedProfile) {
      // הפרופיל עוד לא נשמר - שומרים את הקובץ מקומית ומעלים אותו בפועל בשמירה
      setPendingFiles((prev) => [...prev, file])
      return
    }

    setIsUploadingResume(true)
    try {
      setResumeFiles(await uploadAndRegisterResume(file))
    } catch (error) {
      console.error('Failed to upload resume file', error)
      setErrors((prev) => ({ ...prev, resumeFile: t('professionalProfile.modal.errors.uploadFailed') }))
    } finally {
      setIsUploadingResume(false)
    }
  }

  const handlePendingFileRemove = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleResumeDelete = async (fileKey: string) => {
    try {
      const response = await apiCall<{ success: boolean; profile: RawProfessionalProfile }>(
        API_ENDPOINTS.professionalProfile.removeResume(fileKey),
        { method: 'DELETE' },
      )
      setResumeFiles(response.profile.resumeFiles ?? [])
    } catch (error) {
      console.error('Failed to delete resume file', error)
      setErrors((prev) => ({ ...prev, resumeFile: t('professionalProfile.modal.errors.deleteFailed') }))
    }
  }

  const totalFileCount = resumeFiles.length + pendingFiles.length

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" dir={dir} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>{t('professionalProfile.modal.title')}</h2>
            <p>{t('professionalProfile.modal.subtitle')}</p>
          </div>
          <div>
            <button type="button" className="tab-button" onClick={onClose}>
              {t('professionalProfile.modal.close')}
            </button>
          </div>
        </header>

        <form className="modal-section apply-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">{t('professionalProfile.modal.nameLabel')}</span>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                }}
                placeholder={t('professionalProfile.modal.namePlaceholder')}
                maxLength={INPUT_LIMITS.name}
                required
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </label>

            <label className="form-field form-full">
              <span className="form-label">{t('professionalProfile.modal.descriptionLabel')}</span>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }))
                }}
                placeholder={t('professionalProfile.modal.descriptionPlaceholder')}
                maxLength={INPUT_LIMITS.description}
                rows={4}
              />
              {errors.description && <span className="form-error">{errors.description}</span>}
            </label>

            <label className="form-field form-full">
              <span className="form-label">{t('professionalProfile.modal.experienceLabel')}</span>
              <textarea
                className="form-textarea"
                value={experience}
                onChange={(e) => {
                  setExperience(e.target.value)
                  if (errors.experience) setErrors((prev) => ({ ...prev, experience: undefined }))
                }}
                placeholder={t('professionalProfile.modal.experiencePlaceholder')}
                maxLength={INPUT_LIMITS.experience}
                rows={4}
              />
              {errors.experience && <span className="form-error">{errors.experience}</span>}
            </label>

            <label className="form-field">
              <span className="form-label">{t('professionalProfile.modal.portfolioLabel')}</span>
              <input
                className="form-input"
                type="url"
                value={portfolioLink}
                onChange={(e) => {
                  setPortfolioLink(e.target.value)
                  if (errors.portfolioLink) setErrors((prev) => ({ ...prev, portfolioLink: undefined }))
                }}
                placeholder="https://..."
                maxLength={INPUT_LIMITS.portfolioLink}
              />
              {errors.portfolioLink && <span className="form-error">{errors.portfolioLink}</span>}
            </label>

            <div className="form-field form-full">
              <span className="form-label">{t('professionalProfile.modal.resumeFilesLabel', { current: totalFileCount, max: MAX_RESUME_FILES })}</span>

              {totalFileCount > 0 && (
                <ul className="resume-file-list">
                  {resumeFiles.map((file) => (
                    <li key={file.fileKey} className="resume-file-row">
                      <span>{file.fileName}</span>
                      <button type="button" className="secondary-button" onClick={() => handleResumeDelete(file.fileKey)}>
                        {t('professionalProfile.modal.delete')}
                      </button>
                    </li>
                  ))}
                  {pendingFiles.map((file, index) => (
                    <li key={`pending-${index}-${file.name}`} className="resume-file-row">
                      <span>
                        {file.name}
                        <em className="pending-badge">{t('professionalProfile.modal.pendingSave')}</em>
                      </span>
                      <button type="button" className="secondary-button" onClick={() => handlePendingFileRemove(index)}>
                        {t('professionalProfile.modal.remove')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {totalFileCount < MAX_RESUME_FILES && (
                <input
                  className="form-input"
                  type="file"
                  accept="application/pdf"
                  disabled={isUploadingResume}
                  onChange={(e) => {
                    handleFileSelect(e.target.files?.[0] ?? null)
                    e.target.value = ''
                  }}
                />
              )}
              {errors.resumeFile && <span className="form-error">{errors.resumeFile}</span>}
            </div>
          </div>

          <div className="modal-actions mt-18 actions-row">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? t('professionalProfile.modal.saving') : savedProfile ? t('professionalProfile.modal.save') : t('professionalProfile.modal.create')}
            </button>
            <button type="button" className="secondary-button" onClick={onClose} disabled={isSaving}>
              {savedProfile ? t('professionalProfile.modal.close') : t('professionalProfile.modal.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
