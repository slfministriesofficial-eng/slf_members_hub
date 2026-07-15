import { Card } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'

export function ReportsScreen() {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <h1 className="font-display text-[20px] font-bold text-heading">Reports &amp; Analytics</h1>
        <IconButton icon="download" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Card className="p-3.5">
          <div className="font-display text-[22px] font-bold text-heading">86%</div>
          <div className="mt-0.5 text-[10.5px] text-slate">Attendance rate · Jul</div>
        </Card>
        <Card className="p-3.5">
          <div className="font-display text-[22px] font-bold text-status-regular-fg">+14</div>
          <div className="mt-0.5 text-[10.5px] text-slate">Visitor → Member, YTD</div>
        </Card>
        <Card className="p-3.5">
          <div className="font-display text-[22px] font-bold text-heading">3</div>
          <div className="mt-0.5 text-[10.5px] text-slate">Baptisms this year</div>
        </Card>
        <Card className="p-3.5">
          <div className="font-display text-[22px] font-bold text-status-alert-fg">6</div>
          <div className="mt-0.5 text-[10.5px] text-slate">Most-missed members</div>
        </Card>
      </div>

      <Card className="p-4">
        <p className="text-[12.5px] text-slate">
          Attendance trend charts, ministry-wise breakdowns and exportable reports will render
          here once the Apps Script API is connected — this screen is placeholder-only for now.
        </p>
      </Card>
    </div>
  )
}
