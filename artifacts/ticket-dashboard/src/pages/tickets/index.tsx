import { useState } from "react";
import { useListTickets, useListPanels } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { format } from "date-fns";
import { Search, Filter } from "lucide-react";
import { ListTicketsStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export default function Tickets() {
  const [statusFilter, setStatusFilter] = useState<ListTicketsStatus | "all">("all");
  const [panelFilter, setPanelFilter] = useState<string>("all");

  const { data: panels } = useListPanels();
  const { data: tickets, isLoading } = useListTickets({
    status: statusFilter === "all" ? undefined : statusFilter as ListTicketsStatus,
    panelId: panelFilter === "all" ? undefined : parseInt(panelFilter, 10)
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
          <p className="text-muted-foreground text-sm font-mono mt-1">SUPPORT_QUEUE_LOG</p>
        </div>
      </div>

      <Card className="bg-card/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tickets (not fully implemented in api)..." className="pl-9 bg-background/50 border-primary/20" />
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-full sm:w-[150px] font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={panelFilter} onValueChange={setPanelFilter}>
                <SelectTrigger className="w-full sm:w-[180px] font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5" />
                    <SelectValue placeholder="Panel" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Panels</SelectItem>
                  {panels?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-mono text-xs w-[100px]">ID</TableHead>
                  <TableHead className="font-mono text-xs">USER</TableHead>
                  <TableHead className="font-mono text-xs">PANEL</TableHead>
                  <TableHead className="font-mono text-xs">STATUS</TableHead>
                  <TableHead className="font-mono text-xs text-right">OPENED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-mono text-sm">
                      LOADING_TICKETS...
                    </TableCell>
                  </TableRow>
                ) : tickets?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-mono text-sm">
                      NO_TICKETS_FOUND
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets?.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-muted/30 cursor-pointer transition-colors group">
                      <TableCell className="font-mono text-xs text-muted-foreground group-hover:text-primary">
                        <Link href={`/tickets/${ticket.id}`} className="block">#{ticket.id}</Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tickets/${ticket.id}`} className="block font-medium">
                          {ticket.userName}
                          <span className="block text-xs text-muted-foreground font-mono">{ticket.userId}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tickets/${ticket.id}`} className="block">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary text-xs">
                            <span aria-hidden="true">{ticket.panelEmoji}</span>
                            {ticket.panelName}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tickets/${ticket.id}`} className="block">
                          <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className="font-mono uppercase tracking-wider text-[10px]">
                            {ticket.status}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        <Link href={`/tickets/${ticket.id}`} className="block">
                          {format(new Date(ticket.createdAt), "MMM d, yyyy HH:mm")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
