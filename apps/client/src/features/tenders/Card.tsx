import { useTranslation } from 'react-i18next'
import type { TenderTime } from './types'
import { formatTenderTime } from './timeUnits'
import { useLocale } from '../../i18n/useLocale'

const formatBudget = (budget?: number): string => {
  return budget === undefined || budget === null ? '—' : budget.toString()
}

const formatAppliedAt = (locale: string, appliedAt?: string): string => {
  if (!appliedAt) return ''
  const date = new Date(appliedAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale)
}

interface TenderCardProps {
  id: string
  title: string
  publisherUserCode?: string
  shortDescription?: string
  timeRequired?: TenderTime
  budget?: number
  productType?: string
  aiApplicationType?: string
  wantsEmails?: boolean
  applicantsCount?: number
  newOffersCount?: number
  appliedAt?: string
  onView: () => void
  onViewOffers?: () => void
}

export default function Card({
  id,
  title,
  shortDescription,
  timeRequired,
  budget,
  productType,
  aiApplicationType,
  applicantsCount = 0,
  newOffersCount = 0,
  appliedAt,
  onView,
  onViewOffers,
}: TenderCardProps) {
  const { t } = useTranslation()
  const { locale } = useLocale()
  const appliedAtLabel = formatAppliedAt(locale, appliedAt)

  return (
    <article
      className={`tender-card${appliedAtLabel ? ' tender-card--applied' : ''}`}
      aria-labelledby={`tender-${id}`}
      style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
    >
      {appliedAtLabel && (
        <span className="tender-card__applied-badge">{t('tenders.card.appliedOn', { date: appliedAtLabel })}</span>
      )}

      <div className="tender-card__header">
        <div>
          <h3 id={`tender-${id}`}>{title}</h3>
        </div>
      </div>

      {/* תיבת טקסט מוגבלת בגובה עם גלילה פנימית עבור תיאורים ארוכים */}
      {shortDescription && (
        <div 
          className="tender-card__summary-wrapper" 
          style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '12px', paddingInlineEnd: '4px' }}
        >
          <p className="tender-card__summary" style={{ margin: 0 }}>{shortDescription}</p>
        </div>
      )}

      <div className="tender-card__meta">
        <div>
          <span>{t('tenders.budgetLabel')}</span>
          <strong>{t('tenders.budgetWithCurrency', { amount: formatBudget(budget) })}</strong>
        </div>
        <div>
          <span>{t('tenders.timeRequiredLabel')}</span>
          <strong>{formatTenderTime(t, timeRequired)}</strong>
        </div>
        <div>
          <span>{t('tenders.applicantsCountLabel')}</span>
          <strong>{applicantsCount}</strong>
        </div>
        <div>
          <span>&nbsp;</span>
          <strong>&nbsp;</strong>
        </div>
      </div>

      {(productType || aiApplicationType) && (
        <div className="tender-card__tags" style={{ marginTop: 'auto', paddingTop: '10px' }}>
          {productType && (
            <span className="domain-pill" style={{ backgroundColor: 'var(--gray-100)', color: 'var(--text-secondary)' }}>
              {t(`tenders.productTypeOptions.${productType}`, { defaultValue: productType })}
            </span>
          )}
          {aiApplicationType && (
            <span className="domain-pill">
              {t(`tenders.aiApplicationOptions.${aiApplicationType}`, { defaultValue: aiApplicationType })}
            </span>
          )}
        </div>
      )}

      <div className="tender-card__actions" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <button type="button" className="details-button" onClick={onView}>
          {t('tenders.detailsButton')}
        </button>
        {onViewOffers && (
          <button
            type="button"
            className="details-button"
            onClick={onViewOffers}
            style={{ position: 'relative' }}
          >
            {t('tenders.card.offersBtn')}
            {newOffersCount > 0 && (
              <span
                aria-label={t('tenders.card.newOffersAria', { count: newOffersCount })}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  insetInlineEnd: '-8px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--color-danger)',
                  color: 'var(--text-inverse)',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                {newOffersCount}
              </span>
            )}
          </button>
        )}
      </div>
    </article>
  )
}