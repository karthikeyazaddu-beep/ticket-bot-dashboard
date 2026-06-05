import { useGetTicketStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, DoorOpen, CheckCircle2 } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetTicketStats();

  if (isLoading) {
    return <div className="text-muted-foreground font-mono text-sm">LOADING_STATS...</div>;
  }

  if (!stats) {
    return <div className="text-destructive font-mono text-sm">ERR_LOADING_STATS</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
            <DoorOpen className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.open}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closed Tickets</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.closed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Activity by Panel</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.byPanel.map((panel) => (
            <Card key={panel.panelId} className="bg-card/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">{panel.panelEmoji}</span>
                  {panel.panelName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-mono text-primary">{panel.count} <span className="text-sm text-muted-foreground">tickets</span></div>
              </CardContent>
            </Card>
          ))}
          {stats.byPanel.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground text-sm font-mono border border-dashed border-border rounded-lg">
              NO_PANEL_DATA_FOUND
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
