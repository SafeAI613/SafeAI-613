import { useTranslation } from 'react-i18next'
import type { Applicant, Tender } from './types'
import { useLocale } from '../../i18n/useLocale'

interface Props {
  tender: Tender
  applicant: Applicant
  onClose: () => void
}

const formatAppliedAt = (locale: string, appliedAt?: string): string => {
  if (!appliedAt) return '—'
  const date = new Date(appliedAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(locale)
}

export default function ViewMyApplication({ tender, applicant, onClose }: Props) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <h2>{t('tenders.myApplication.title')}</h2>
            <p>{tender.title}</p>
          </div>
          <div>
            <button type="button" className="tab-button" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        </header>

        <section className="modal-section apply-form">
          <div className="form-grid">
            <div className="form-field">
              <span className="form-label">{t('tenders.myApplication.submittedOn')}</span>
              <p className="form-input view-application__value">{formatAppliedAt(locale, applicant.appliedAt)}</p>
            </div>

            <div className="form-field">
              <span className="form-label">{t('tenders.nameLabel')}</span>
              <p className="form-input view-application__value">{applicant.name}</p>
            </div>

            <div className="form-field">
              <span className="form-label">{t('tenders.emailLabel')}</span>
              <p className="form-input view-application__value">{applicant.email}</p>
            </div>

            <div className="form-field form-full">
              <span className="form-label">{t('tenders.detailsLabel')}</span>
              <p className="form-textarea view-application__value" style={{ whiteSpace: 'pre-line' }}>{applicant.details}</p>
            </div>

            <div className="form-field">
              <span className="form-label">{t('tenders.myApplication.proposalInShekels')}</span>
              <p className="form-input view-application__value">{applicant.proposal ?? '—'}</p>
            </div>

            <div className="form-field">
              <span className="form-label">{t('tenders.contactMethodLabel')}</span>
              <p className="form-input view-application__value">{applicant.contactMethod ?? '—'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
