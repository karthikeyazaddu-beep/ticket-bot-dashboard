import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreatePanel, useListGuilds } from "@workspace/api-client-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Server } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  guildId: z.string().min(1, "Guild is required"),
  name: z.string().min(1, "Name is required"),
  emoji: z.string().min(1, "Emoji is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().optional(),
  categoryId: z.string().optional(),
  staffRoleIds: z.string().optional(), // Will split by comma
  color: z.string().optional(),
  welcomeMessage: z.string().optional(),
});

export default function NewPanel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: guilds, isLoading: isLoadingGuilds } = useListGuilds();
  const createPanel = useCreatePanel();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guildId: "",
      name: "",
      emoji: "🎫",
      description: "",
      imageUrl: "",
      categoryId: "",
      staffRoleIds: "",
      color: "#5865F2",
      welcomeMessage: "Welcome! Support will be with you shortly.",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createPanel.mutate(
      {
        data: {
          ...values,
          staffRoleIds: values.staffRoleIds ? values.staffRoleIds.split(",").map((id) => id.trim()).filter(Boolean) : [],
        },
      },
      {
        onSuccess: (panel) => {
          toast({
            title: "Panel Created",
            description: "Successfully configured new ticket panel.",
          });
          setLocation(`/panels/${panel.id}`);
        },
        onError: (err) => {
          toast({
            title: "Error",
            description: "Failed to create panel.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/panels">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Panel</h2>
          <p className="text-muted-foreground text-sm font-mono mt-1">INITIALIZE_NEW_PANEL</p>
        </div>
      </div>

      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Panel Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="guildId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Guild</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-mono">
                          <SelectValue placeholder={isLoadingGuilds ? "LOADING_GUILDS..." : "SELECT_GUILD"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {guilds?.map((guild) => (
                          <SelectItem key={guild.id} value={guild.id}>
                            <div className="flex items-center gap-2">
                              <Server className="h-4 w-4" />
                              {guild.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Panel Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. General Support" {...field} />
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
                        <Input placeholder="🎫" {...field} className="font-mono" />
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
                      <Input placeholder="Click below to open a support ticket" {...field} />
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
                        <Input placeholder="Discord category ID for tickets" className="font-mono text-sm" {...field} />
                      </FormControl>
                      <FormDescription>Where new tickets will be created.</FormDescription>
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
                        <Input placeholder="Comma-separated role IDs" className="font-mono text-sm" {...field} />
                      </FormControl>
                      <FormDescription>Roles allowed to view/manage tickets.</FormDescription>
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
                      <FormLabel>Image URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." className="font-mono text-sm" {...field} />
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
                      <Textarea
                        placeholder="Message sent in the ticket when opened."
                        className="min-h-[100px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createPanel.isPending}>
                  {createPanel.isPending ? "INITIALIZING..." : "CREATE_PANEL"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
