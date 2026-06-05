import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetPanel,
  getGetPanelQueryKey,
  useUpdatePanel,
  useDeletePanel,
  useSendPanel,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Trash2, Send, Save, Hash } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  emoji: z.string().min(1, "Emoji is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().optional(),
  categoryId: z.string().optional(),
  staffRoleIds: z.string().optional(),
  color: z.string().optional(),
  welcomeMessage: z.string().optional(),
});

export default function PanelDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: panel, isLoading } = useGetPanel(id, {
    query: { enabled: !!id, queryKey: getGetPanelQueryKey(id) },
  });

  const updatePanel = useUpdatePanel();
  const deletePanel = useDeletePanel();
  const sendPanel = useSendPanel();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      emoji: "",
      description: "",
      imageUrl: "",
      categoryId: "",
      staffRoleIds: "",
      color: "#5865F2",
      welcomeMessage: "",
    },
  });

  useEffect(() => {
    if (panel) {
      form.reset({
        name: panel.name,
        emoji: panel.emoji,
        description: panel.description,
        imageUrl: panel.imageUrl || "",
        categoryId: panel.categoryId || "",
        staffRoleIds: panel.staffRoleIds?.join(", ") || "",
        color: panel.color || "#5865F2",
        welcomeMessage: panel.welcomeMessage || "",
      });
    }
  }, [panel, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updatePanel.mutate(
      {
        id,
        data: {
          ...values,
          staffRoleIds: values.staffRoleIds
            ? values.staffRoleIds.split(",").map((id) => id.trim()).filter(Boolean)
            : [],
        },
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetPanelQueryKey(id), data);
          toast({ title: "Panel Updated", description: "Changes saved successfully." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update panel.", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    deletePanel.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Panel Deleted" });
          setLocation("/panels");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to delete panel.", variant: "destructive" });
        },
      }
    );
  };

  const [sendChannelId, setSendChannelId] = useState("");
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);

  const handleSend = () => {
    if (!sendChannelId) return;
    sendPanel.mutate(
      { id, data: { channelId: sendChannelId } },
      {
        onSuccess: () => {
          toast({ title: "Panel Sent", description: "Panel embed sent to channel successfully." });
          setIsSendDialogOpen(false);
          setSendChannelId("");
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to send panel.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="text-muted-foreground font-mono text-sm">LOADING_PANEL_DATA...</div>;
  }

  if (!panel) {
    return <div className="text-destructive font-mono text-sm">ERR_PANEL_NOT_FOUND</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0">
            <Link href="/panels">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{panel.name}</h2>
            <div className="flex items-center gap-2 mt-1 text-xs font-mono text-muted-foreground">
              <span>ID: {panel.id}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" /> {panel.ticketCount} TICKETS
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
                <Send className="h-4 w-4" />
                Send to Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Panel to Channel</DialogTitle>
                <DialogDescription>
                  Enter the Discord channel ID where the ticket creation embed should be sent.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  placeholder="Channel ID"
                  className="font-mono"
                  value={sendChannelId}
                  onChange={(e) => setSendChannelId(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSend} disabled={!sendChannelId || sendPanel.isPending}>
                  {sendPanel.isPending ? "SENDING..." : "Send Panel"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Panel?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the ticket panel configuration.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Edit Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Panel Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emoji"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emoji</FormLabel>
                      <FormControl>
                        <Input {...field} className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category ID</FormLabel>
                      <FormControl>
                        <Input className="font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="staffRoleIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Role IDs</FormLabel>
                      <FormControl>
                        <Input className="font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color (Hex)</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" className="w-12 p-1 h-10 cursor-pointer" {...field} />
                          <Input className="font-mono" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input className="font-mono text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="welcomeMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome Message</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px] resize-y" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4 border-t border-border">
                <Button type="submit" disabled={updatePanel.isPending || !form.formState.isDirty} className="gap-2">
                  <Save className="h-4 w-4" />
                  {updatePanel.isPending ? "SAVING..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
