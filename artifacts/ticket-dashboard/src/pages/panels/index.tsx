import { useState } from "wouter";
import { useListPanels, getListPanelsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Hash, Palette } from "lucide-react";
import { Link } from "wouter";

export default function Panels() {
  const { data: panels, isLoading } = useListPanels();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Panels</h2>
          <p className="text-muted-foreground text-sm font-mono mt-1">CONFIGURED_SUPPORT_PANELS</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/panels/new">
            <Plus className="h-4 w-4" />
            Create Panel
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground font-mono text-sm">LOADING_PANELS...</div>
      ) : panels?.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg bg-card/10">
          <p className="text-muted-foreground font-mono text-sm mb-4">NO_PANELS_FOUND</p>
          <Button asChild variant="outline">
            <Link href="/panels/new">Create First Panel</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {panels?.map((panel) => (
            <Link key={panel.id} href={`/panels/${panel.id}`}>
              <Card className="bg-card/50 hover:bg-card/80 transition-colors cursor-pointer border-border hover:border-primary/50 group h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span className="text-xl" aria-hidden="true">{panel.emoji}</span>
                      <span className="group-hover:text-primary transition-colors">{panel.name}</span>
                    </CardTitle>
                    {panel.color && (
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: panel.color }} />
                    )}
                  </div>
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                    {panel.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0 flex gap-4 text-xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    {panel.ticketCount || 0} tickets
                  </div>
                  {panel.staffRoleIds && panel.staffRoleIds.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {panel.staffRoleIds.length} roles
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
