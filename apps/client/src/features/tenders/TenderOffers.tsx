import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../../i18n/useLocale'
import { apiCall, API_ENDPOINTS } from '../../config/api'
import type { Tender } from './types'

interface TenderOffersProps {
  tender: Tender
  onClose: () => void
  onUpdateTender: (updatedTender: Tender) => void
  highlightApplicantId?: string | null
}

export default function TenderOffers({ tender, onClose, onUpdateTender, highlightApplicantId }: TenderOffersProps) {
  const { t } = useTranslation()
  const { dir } = useLocale()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const highlightedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (highlightApplicantId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightApplicantId])

  // כניסה למסך ההצעות מסמנת אותן כנצפו, כדי שהחיווי ב"המכרזים שלי" יתאפס.
  // מעדכנים את המצב המקומי מיד (ולא מתוך תגובת השרת), כדי לא להסתמך על הצורה
  // המדויקת של המסמך שחוזר מה-API (המכרז המקורי כבר מנורמל ומכיל id תקין).
  useEffect(() => {
    if (!tender.id) return

    apiCall<{ success: boolean; tender: Tender }>(API_ENDPOINTS.tenders.viewOffers(tender.id), {
      method: 'PATCH',
    })
      .then((response) => {
        if (response.success) {
          onUpdateTender({
            ...tender,
            applicants: (tender.applicants ?? []).map((applicant) => ({ ...applicant, isViewed: true })),
          })
        }
      })
      .catch((error) => {
        console.error('Failed to mark tender offers as viewed', error)
        setErrorMessage(t('tenders.offers.markViewedError'))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tender.id])

  return (
    <article className="detail-panel content-page-full" style={{ padding: '24px', maxWidth: '95%', margin: '0 auto', boxSizing: 'border-box' }} dir={dir}>
      <header className="detail-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>{t('tenders.offers.title', { title: tender.title })}</h2>
        <button type="button" className="tab-button" onClick={onClose}>
          {t('tenders.backToListBtn')}
        </button>
      </header>

      {errorMessage && (
        <div className="error-message" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}

      <section className="applicants-section">
        <h3>{t('tenders.applicantsHeading', { count: tender.applicants?.length ?? 0 })}</h3>
        {tender.applicants && tender.applicants.length > 0 ? (
          tender.applicants.map((applicant, index) => {
            const isHighlighted = Boolean(highlightApplicantId) && applicant._id === highlightApplicantId
            return (
              <article
                key={`${applicant.email}-${index}`}
                ref={isHighlighted ? highlightedRef : undefined}
                className="applicant-card"
                style={{
                  padding: '12px',
                  // No frame: a soft fill separates the card; the highlighted
                  // offer gets a thick accent bar on the start side instead.
                  borderInlineStart: isHighlighted ? '4px solid var(--color-info)' : undefined,
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '10px',
                  backgroundColor: isHighlighted ? 'var(--color-info-bg)' : 'var(--bg-elevated)',
                }}
              >
                <h4>{applicant.name}</h4>
                <p><strong>{t('tenders.applicantEmailLabel')}</strong> {applicant.email}</p>
                <p><strong>{t('tenders.applicantDetailsLabel')}</strong> {applicant.details}</p>
                {applicant.proposal && <p><strong>{t('tenders.applicantProposalLabel')}</strong> {applicant.proposal}</p>}
                {applicant.contactMethod && <p><strong>{t('tenders.applicantContactMethodLabel')}</strong> {applicant.contactMethod}</p>}
                {applicant.professionalProfile && (
                  <div style={{ marginTop: '8px', padding: '8px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                    <p><strong>{t('tenders.offers.professionalProfile', { name: applicant.professionalProfile.name })}</strong></p>
                    {applicant.professionalProfile.description && <p>{applicant.professionalProfile.description}</p>}
                    {applicant.professionalProfile.experience && (
                      <p><strong>{t('tenders.offers.experience')}</strong> {applicant.professionalProfile.experience}</p>
                    )}
                  </div>
                )}
                {applicant.resumeFileKey && (
                  <p>
                    <strong>{t('tenders.offers.resume')}</strong>{' '}
                    <a href={applicant.resumeFileKey} target="_blank" rel="noopener noreferrer">
                      {t('tenders.offers.openFile')}
                    </a>
                  </p>
                )}
                {applicant.portfolioLink && (
                  <p>
                    <strong>{t('tenders.offers.portfolio')}</strong>{' '}
                    <a href={applicant.portfolioLink} target="_blank" rel="noopener noreferrer">
                      {applicant.portfolioLink}
                    </a>
                  </p>
                )}
              </article>
            )
          })
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>{t('tenders.noApplicantsMessage')}</p>
        )}
      </section>
    </article>
  )
}
