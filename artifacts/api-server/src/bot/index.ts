import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
  Message,
  ButtonInteraction,
  Collection,
} from "discord.js";
import { db } from "@workspace/db";
import { panelsTable, ticketsTable, transcriptsTable, guildSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const PREFIX = "$";

let client: Client | null = null;

export function getClient(): Client | null {
  return client;
}

export function initBot(token: string) {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info({ tag: c.user.tag }, "Discord bot ready");
  });

  client.on(Events.MessageCreate, handleMessage);
  client.on(Events.InteractionCreate, handleInteraction);

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord");
  });

  return client;
}

async function handleMessage(message: Message) {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;
  if (!message.guild) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  const ticket = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.channelId, message.channelId),
        eq(ticketsTable.status, "open")
      )
    )
    .limit(1)
    .then((r) => r[0]);

  if (!ticket) return;

  switch (command) {
    case "rename":
      await handleRename(message, args, ticket);
      break;
    case "add":
      await handleAdd(message, args, ticket);
      break;
    case "remove":
      await handleRemove(message, args, ticket);
      break;
    case "escalate":
      await handleEscalate(message, ticket);
      break;
    case "delete":
      await handleDelete(message, ticket);
      break;
  }
}

async function handleRename(message: Message, args: string[], ticket: any) {
  const newName = args.join("-").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!newName) {
    await message.reply("Usage: `$rename <new-name>`");
    return;
  }
  try {
    const channel = message.channel as TextChannel;
    await channel.setName(`ticket-${newName}`);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setDescription(`🔤 Ticket renamed to **ticket-${newName}** by ${message.author.tag}`);
    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    await message.reply("Failed to rename the channel.");
  }
}

async function handleAdd(message: Message, args: string[], ticket: any) {
  const mention = message.mentions.users.first();
  if (!mention) {
    await message.reply("Usage: `$add @user`");
    return;
  }
  try {
    const channel = message.channel as TextChannel;
    await channel.permissionOverwrites.create(mention.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setDescription(`✅ ${mention.tag} has been added to the ticket by ${message.author.tag}`);
    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    await message.reply("Failed to add user.");
  }
}

async function handleRemove(message: Message, args: string[], ticket: any) {
  const mention = message.mentions.users.first();
  if (!mention) {
    await message.reply("Usage: `$remove @user`");
    return;
  }
  if (mention.id === ticket.userId) {
    await message.reply("You cannot remove the ticket creator.");
    return;
  }
  try {
    const channel = message.channel as TextChannel;
    await channel.permissionOverwrites.delete(mention.id);
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setDescription(`🚫 ${mention.tag} has been removed from the ticket by ${message.author.tag}`);
    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    await message.reply("Failed to remove user.");
  }
}

async function handleEscalate(message: Message, ticket: any) {
  const panels = await db
    .select()
    .from(panelsTable)
    .where(eq(panelsTable.guildId, message.guild!.id));

  const otherPanels = panels.filter((p) => p.id !== ticket.panelId);

  if (otherPanels.length === 0) {
    await message.reply("No other panels to escalate to.");
    return;
  }

  const buttons = otherPanels.slice(0, 5).map((p) =>
    new ButtonBuilder()
      .setCustomId(`escalate_${p.id}_${ticket.id}`)
      .setLabel(`${p.emoji} ${p.name}`)
      .setStyle(ButtonStyle.Primary)
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("⬆️ Escalate Ticket")
    .setDescription(
      `**${message.author.tag}** wants to escalate this ticket.\nSelect a panel to escalate to:`
    )
    .setFooter({ text: `Current panel: ${ticket.panelEmoji} ${ticket.panelName}` });

  await message.channel.send({ embeds: [embed], components: [row] });
}

async function handleDelete(message: Message, ticket: any) {
  const channel = message.channel as TextChannel;

  const messages: { authorId: string; authorName: string; authorAvatar: string | null; content: string; timestamp: string }[] = [];

  let lastId: string | undefined;
  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
    if (fetched.size === 0) break;
    fetched.forEach((msg) => {
      messages.unshift({
        authorId: msg.author.id,
        authorName: msg.author.tag,
        authorAvatar: msg.author.displayAvatarURL() || null,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
      });
    });
    lastId = fetched.last()?.id;
    if (fetched.size < 100) break;
  }

  await db.insert(transcriptsTable).values({
    ticketId: ticket.id,
    messages: JSON.stringify(messages),
  }).onConflictDoUpdate({
    target: transcriptsTable.ticketId,
    set: { messages: JSON.stringify(messages) },
  });

  await db
    .update(ticketsTable)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(ticketsTable.id, ticket.id));

  const transcriptUrl = `${process.env.DASHBOARD_URL || ""}/tickets/${ticket.id}`;

  const [settings] = await db
    .select()
    .from(guildSettingsTable)
    .where(eq(guildSettingsTable.guildId, message.guild!.id));

  if (settings?.logChannelId) {
    try {
      const logChannel = await message.guild!.channels.fetch(settings.logChannelId) as TextChannel;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle(`🔴 Ticket Closed — #${channel.name}`)
          .addFields(
            { name: "Opened by", value: `<@${ticket.userId}> (${ticket.userName})`, inline: true },
            { name: "Panel", value: `${ticket.panelEmoji} ${ticket.panelName}`, inline: true },
            { name: "Closed by", value: message.author.tag, inline: true },
            { name: "Transcript", value: `[View transcript](${transcriptUrl})` }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (err) {
      logger.warn({ err }, "Could not send to log channel");
    }
  }

  const closeEmbed = new EmbedBuilder()
    .setColor(0xed4245)
    .setDescription(`🔴 Ticket closed by **${message.author.tag}**. This channel will be deleted in 5 seconds.`);
  await message.channel.send({ embeds: [closeEmbed] });

  setTimeout(async () => {
    try {
      await channel.delete("Ticket closed");
    } catch (err) {
      logger.warn({ err }, "Could not delete ticket channel");
    }
  }, 5000);
}

async function handleInteraction(interaction: any) {
  if (!interaction.isButton()) return;

  const btn = interaction as ButtonInteraction;
  const customId = btn.customId;

  if (customId.startsWith("open_ticket_")) {
    const panelId = parseInt(customId.replace("open_ticket_", ""), 10);
    await handleOpenTicket(btn, panelId);
    return;
  }

  if (customId.startsWith("escalate_")) {
    const parts = customId.split("_");
    const targetPanelId = parseInt(parts[1], 10);
    const ticketId = parseInt(parts[2], 10);
    await handleEscalateButton(btn, targetPanelId, ticketId);
    return;
  }
}

async function handleOpenTicket(interaction: ButtonInteraction, panelId: number) {
  await interaction.deferReply({ ephemeral: true });

  const [panel] = await db
    .select()
    .from(panelsTable)
    .where(eq(panelsTable.id, panelId));

  if (!panel) {
    await interaction.editReply("Panel not found.");
    return;
  }

  const guild = interaction.guild!;
  const user = interaction.user;

  const existing = await db
    .select()
    .from(ticketsTable)
    .where(
      and(
        eq(ticketsTable.guildId, guild.id),
        eq(ticketsTable.userId, user.id),
        eq(ticketsTable.panelId, panelId),
        eq(ticketsTable.status, "open")
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await interaction.editReply(`You already have an open ticket: <#${existing[0].channelId}>`);
    return;
  }

  const staffRoleIds: string[] = JSON.parse(panel.staffRoleIds || "[]");

  const permissionOverwrites: any[] = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
  ];

  for (const roleId of staffRoleIds) {
    permissionOverwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    type: ChannelType.GuildText,
    parent: panel.categoryId || undefined,
    permissionOverwrites,
  }) as TextChannel;

  const colorHex = panel.color ? parseInt(panel.color.replace("#", ""), 16) : 0x5865f2;

  const welcomeEmbed = new EmbedBuilder()
    .setColor(colorHex)
    .setTitle(`${panel.emoji} ${panel.name}`)
    .setDescription(panel.welcomeMessage || `Hello ${user.toString()}! Support will be with you shortly.\n\nPlease describe your issue.`)
    .setFooter({ text: `Use $delete to close this ticket` })
    .setTimestamp();

  if (panel.imageUrl) welcomeEmbed.setImage(panel.imageUrl);

  const [inserted] = await db.insert(ticketsTable).values({
    guildId: guild.id,
    panelId: panel.id,
    panelName: panel.name,
    panelEmoji: panel.emoji,
    channelId: channel.id,
    userId: user.id,
    userName: user.tag,
    status: "open",
  }).returning();

  await db
    .update(panelsTable)
    .set({ ticketCount: panel.ticketCount + 1 })
    .where(eq(panelsTable.id, panel.id));

  await channel.send({ embeds: [welcomeEmbed] });
  await interaction.editReply(`Your ticket has been opened: ${channel.toString()}`);
}

async function handleEscalateButton(interaction: ButtonInteraction, targetPanelId: number, ticketId: number) {
  await interaction.deferUpdate();

  const [ticket] = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.id, ticketId));

  const [targetPanel] = await db
    .select()
    .from(panelsTable)
    .where(eq(panelsTable.id, targetPanelId));

  if (!ticket || !targetPanel) {
    await interaction.followUp({ content: "Ticket or panel not found.", ephemeral: true });
    return;
  }

  const channel = interaction.channel as TextChannel;
  const guild = interaction.guild!;
  const staffRoleIds: string[] = JSON.parse(targetPanel.staffRoleIds || "[]");

  await db
    .update(ticketsTable)
    .set({ panelId: targetPanel.id, panelName: targetPanel.name, panelEmoji: targetPanel.emoji })
    .where(eq(ticketsTable.id, ticketId));

  const currentOverwrites = channel.permissionOverwrites.cache;
  const oldPanel = await db
    .select()
    .from(panelsTable)
    .where(eq(panelsTable.id, ticket.panelId))
    .then((r) => r[0]);

  if (oldPanel) {
    const oldRoles: string[] = JSON.parse(oldPanel.staffRoleIds || "[]");
    for (const roleId of oldRoles) {
      if (!staffRoleIds.includes(roleId)) {
        try {
          await channel.permissionOverwrites.delete(roleId);
        } catch {}
      }
    }
  }

  for (const roleId of staffRoleIds) {
    await channel.permissionOverwrites.create(roleId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle("⬆️ Ticket Escalated")
    .setDescription(`This ticket has been escalated to **${targetPanel.emoji} ${targetPanel.name}** by ${interaction.user.tag}`)
    .setTimestamp();

  await interaction.message.edit({ embeds: [interaction.message.embeds[0]], components: [] });
  await channel.send({ embeds: [embed] });
}
