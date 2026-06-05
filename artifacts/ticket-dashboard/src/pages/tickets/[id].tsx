import { useParams, Link } from "wouter";
import { useGetTicket, getGetTicketQueryKey, useGetTranscript, getGetTranscriptQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, User, Hash, Server } from "lucide-react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TicketDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);

  const { data: ticket, isLoading: isLoadingTicket } = useGetTicket(id, {
    query: { enabled: !!id, queryKey: getGetTicketQueryKey(id) }
  });

  const { data: transcript, isLoading: isLoadingTranscript } = useGetTranscript(id, {
    query: { enabled: !!id && ticket?.status === 'closed', queryKey: getGetTranscriptQueryKey(id) }
  });

  if (isLoadingTicket) {
    return <div className="text-muted-foreground font-mono text-sm">LOADING_TICKET_DATA...</div>;
  }

  if (!ticket) {
    return <div className="text-destructive font-mono text-sm">ERR_TICKET_NOT_FOUND</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/tickets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">Ticket #{ticket.id}</h2>
              <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className="font-mono uppercase text-xs">
                {ticket.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
              <User className="h-3.5 w-3.5" /> {ticket.userName}
              <span className="text-border mx-1">|</span>
              <span aria-hidden="true">{ticket.panelEmoji}</span> {ticket.panelName}
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 shrink-0">
        <Card className="bg-card/50 md:col-span-1">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">METADATA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground font-mono mb-1">USER_ID</div>
              <div className="font-mono bg-secondary/50 p-1.5 rounded text-xs select-all">{ticket.userId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono mb-1">CHANNEL_ID</div>
              <div className="font-mono bg-secondary/50 p-1.5 rounded text-xs select-all">{ticket.channelId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono mb-1">GUILD_ID</div>
              <div className="font-mono bg-secondary/50 p-1.5 rounded text-xs select-all">{ticket.guildId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> OPENED_AT
              </div>
              <div className="text-xs">{format(new Date(ticket.createdAt), "PP pp")}</div>
            </div>
            {ticket.closedAt && (
              <div>
                <div className="text-xs text-muted-foreground font-mono mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> CLOSED_AT
                </div>
                <div className="text-xs">{format(new Date(ticket.closedAt), "PP pp")}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 md:col-span-3 flex flex-col min-h-0">
          <CardHeader className="py-4 border-b border-border shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono">TRANSCRIPT_LOG</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
            {ticket.status === 'open' ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground font-mono text-sm border border-dashed border-border rounded-lg bg-secondary/20 p-8">
                TICKET_IS_CURRENTLY_OPEN
                <span className="text-xs mt-2 block">Transcript will be available once closed.</span>
              </div>
            ) : isLoadingTranscript ? (
              <div className="text-center font-mono text-sm text-muted-foreground py-8">LOADING_TRANSCRIPT...</div>
            ) : !transcript || transcript.messages.length === 0 ? (
              <div className="text-center font-mono text-sm text-muted-foreground py-8">NO_MESSAGES_RECORDED</div>
            ) : (
              <div className="space-y-6">
                {transcript.messages.map((msg, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <Avatar className="h-10 w-10 border border-border shrink-0">
                      <AvatarImage src={msg.authorAvatar || undefined} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground font-mono text-xs">
                        {msg.authorName.slice(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{msg.authorName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{format(new Date(msg.timestamp), "MMM d, HH:mm")}</span>
                      </div>
                      <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
