import { Icon, type IconName } from '../../components/ui/Icon';
import { t } from '../../i18n/id';
import type { StudentStatus } from '../../lib/types';

// Status colours are not the sign colours (blue/red/grey are reserved for numbers, CLAUDE.md §5.4).
const TONE: Record<StudentStatus, string> = {
  tuntas: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  berproses: 'bg-lavender-100 text-plum-700 ring-lavender-300',
  perlu_bimbingan: 'bg-amber-50 text-amber-800 ring-amber-300',
};
const ICON: Record<StudentStatus, IconName> = { tuntas: 'medal', berproses: 'book', perlu_bimbingan: 'support' };

export function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${TONE[status]}`}
    >
      <Icon name={ICON[status]} size={14} />
      {t.teacher.status[status]}
    </span>
  );
}
