import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings, useListGuilds } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Server, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const formSchema = z.object({
  logChannelId: z.string().optional(),
  transcriptChannelId: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: guilds, isLoading: isLoadingGuilds } = useListGuilds();
  
  const [selectedGuildId, setSelectedGuildId] = useState<string>("");

  useEffect(() => {
    if (guilds && guilds.length > 0 && !selectedGuildId) {
      setSelectedGuildId(guilds[0].id);
    }
  }, [guilds, selectedGuildId]);

  const { data: settings, isLoading: isLoadingSettings } = useGetSettings(selectedGuildId, {
    query: { enabled: !!selectedGuildId, queryKey: getGetSettingsQueryKey(selectedGuildId) }
  });

  const updateSettings = useUpdateSettings();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      logChannelId: "",
      transcriptChannelId: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        logChannelId: settings.logChannelId || "",
        transcriptChannelId: settings.transcriptChannelId || "",
      });
    } else {
      form.reset({
        logChannelId: "",
        transcriptChannelId: "",
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!selectedGuildId) return;
    
    updateSettings.mutate(
      {
        guildId: selectedGuildId,
        data: values,
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetSettingsQueryKey(selectedGuildId), data);
          toast({ title: "Settings Saved", description: "Guild settings updated successfully." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
        <p className="text-muted-foreground text-sm font-mono mt-1">GLOBAL_CONFIGURATION</p>
      </div>

      <Card className="bg-card/50 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Target Guild
          </CardTitle>
          <CardDescription>Select which server to configure settings for.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedGuildId} onValueChange={setSelectedGuildId}>
            <SelectTrigger className="font-mono">
              <SelectValue placeholder={isLoadingGuilds ? "LOADING_GUILDS..." : "SELECT_GUILD"} />
            </SelectTrigger>
            <SelectContent>
              {guilds?.map((guild) => (
                <SelectItem key={guild.id} value={guild.id}>
                  {guild.name} ({guild.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedGuildId && (
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Channel Configuration</CardTitle>
            <CardDescription>Configure where automated logs and transcripts are sent.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSettings ? (
              <div className="text-muted-foreground font-mono text-sm py-4">LOADING_SETTINGS...</div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="logChannelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Log Channel ID</FormLabel>
                        <FormControl>
                          <Input className="font-mono text-sm bg-background/50" placeholder="Channel ID for audit logs" {...field} />
                        </FormControl>
                        <FormDescription>Where bot activity and errors are logged.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transcriptChannelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transcript Channel ID</FormLabel>
                        <FormControl>
                          <Input className="font-mono text-sm bg-background/50" placeholder="Channel ID for ticket transcripts" {...field} />
                        </FormControl>
                        <FormDescription>Where HTML transcripts are sent when tickets are closed.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" disabled={updateSettings.isPending || !form.formState.isDirty} className="gap-2">
                      <Save className="h-4 w-4" />
                      {updateSettings.isPending ? "SAVING..." : "Save Configuration"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
