import {
  Client,
  Events,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  TextChannel,
  ChannelType,
  ThreadChannel,
  GuildMember,
} from "discord.js";
import { db } from "@workspace/db";
import { guildSettingsTable, tournamentsTable, tournamentEntriesTable, tournamentMatchesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

export function registerTournamentCommands(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const cmd = interaction as ChatInputCommandInteraction;
      if (cmd.commandName === "setup") {
        const sub = cmd.options.getSubcommand();
        if (sub === "entries") await handleSetupEntries(cmd);
        if (sub === "role") await handleSetupRole(cmd);
        if (sub === "bracket") await handleSetupBracket(cmd);
      }
      if (cmd.commandName === "host") {
        const sub = cmd.options.getSubcommand();
        if (sub === "tourney") await handleHostTourney(cmd);
      }
      if (cmd.commandName === "threads") await handleThreads(cmd);
      if (cmd.commandName === "over") await handleOver(cmd);
      if (cmd.commandName === "update") await handleUpdate(cmd);
    } else if (interaction.isModalSubmit()) {
      const modal = interaction as ModalSubmitInteraction;
      if (modal.customId === "host_tourney_modal") {
        await handleHostTourneyModal(modal);
      }
    }
  });
}

export async function deployTournamentCommands(client: Client) {
  const commands = [
    new SlashCommandBuilder()
      .setName("setup")
      .setDescription("Tournament setup commands (Admin only)")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand((sub) =>
        sub
          .setName("entries")
          .setDescription("Set the channel where users ping themselves to enter")
          .addChannelOption((opt) => opt.setName("channel").setDescription("Entry channel").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub
          .setName("role")
          .setDescription("Set the role auto-assigned on entry")
          .addRoleOption((opt) => opt.setName("role").setDescription("Role to assign").setRequired(true))
      )
      .addSubcommand((sub) =>
        sub
          .setName("bracket")
          .setDescription("Set the channel for bracket posting")
          .addChannelOption((opt) => opt.setName("channel").setDescription("Bracket channel").setRequired(true))
      ),
    new SlashCommandBuilder()
      .setName("host")
      .setDescription("Host a tournament (Admin only)")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand((sub) =>
        sub
          .setName("tourney")
          .setDescription("Host a new tournament")
          .addStringOption((opt) => opt.setName("name").setDescription("Tournament name").setRequired(true))
      ),
    new SlashCommandBuilder()
      .setName("threads")
      .setDescription("Create match threads for the current tournament (Admin only)")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
      .setName("over")
      .setDescription("End current round and enable bracket updates (Admin only)")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder()
      .setName("update")
      .setDescription("Advance bracket and create new round threads (Admin only)")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  ];

  await client.application!.commands.set(commands);
  logger.info("Tournament slash commands deployed");
}

async function handleSetupEntries(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  await db
    .insert(guildSettingsTable)
    .values({ guildId: interaction.guildId!, entryChannelId: channel.id })
    .onConflictDoUpdate({
      target: guildSettingsTable.guildId,
      set: { entryChannelId: channel.id },
    });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Entry Channel Set")
    .setDescription(`Users can now ping themselves in <#${channel.id}> to get the entry role.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetupRole(interaction: ChatInputCommandInteraction) {
  const role = interaction.options.getRole("role", true);
  await db
    .insert(guildSettingsTable)
    .values({ guildId: interaction.guildId!, entryRoleId: role.id })
    .onConflictDoUpdate({
      target: guildSettingsTable.guildId,
      set: { entryRoleId: role.id },
    });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Entry Role Set")
    .setDescription(`Users will receive the <@&${role.id}> role when they ping in the entry channel.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetupBracket(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  await db
    .insert(guildSettingsTable)
    .values({ guildId: interaction.guildId!, bracketChannelId: channel.id })
    .onConflictDoUpdate({
      target: guildSettingsTable.guildId,
      set: { bracketChannelId: channel.id },
    });

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Bracket Channel Set")
    .setDescription(`Brackets will be posted in <#${channel.id}>.`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleHostTourney(interaction: ChatInputCommandInteraction) {
  const name = interaction.options.getString("name", true);

  const modal = new ModalBuilder()
    .setCustomId("host_tourney_modal")
    .setTitle("Host Tournament")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("region")
          .setLabel("Region")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("rank_cap")
          .setLabel("Rank Cap (e.g. Diamond+)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("prize")
          .setLabel("Prize Pool")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("type")
          .setLabel("Type: flash or normal")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue("normal")
      )
    );

  (interaction.client as any).tourneyName = name;
  await interaction.showModal(modal);
}

async function handleHostTourneyModal(interaction: ModalSubmitInteraction) {
  const name = (interaction.client as any).tourneyName;
  const description = interaction.fields.getTextInputValue("description");
  const region = interaction.fields.getTextInputValue("region");
  const rankCap = interaction.fields.getTextInputValue("rank_cap");
  const prize = interaction.fields.getTextInputValue("prize");
  const type = interaction.fields.getTextInputValue("type").toLowerCase();

  const maxEntries = type === "flash" ? 8 : 16;

  const [tournament] = await db.insert(tournamentsTable).values({
    guildId: interaction.guildId!,
    name,
    description,
    region,
    rankCap,
    prize,
    type,
    maxEntries,
    status: "open",
    createdById: interaction.user.id,
    createdByName: interaction.user.tag,
  }).returning();

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`🏆 ${name}`)
    .setDescription(description)
    .addFields(
      { name: "Region", value: region, inline: true },
      { name: "Rank Cap", value: rankCap, inline: true },
      { name: "Prize", value: prize, inline: true },
      { name: "Type", value: type, inline: true },
      { name: "Max Entries", value: String(maxEntries), inline: true },
      { name: "Entries", value: "0 / " + maxEntries, inline: true }
    )
    .setFooter({ text: `Tournament ID: ${tournament.id} | Host: ${interaction.user.tag}` })
    .setTimestamp();

  const [settings] = await db
    .select()
    .from(guildSettingsTable)
    .where(eq(guildSettingsTable.guildId, interaction.guildId!));

  if (settings?.tournamentChannelId) {
    try {
      const channel = await interaction.client.channels.fetch(settings.tournamentChannelId) as TextChannel;
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn({ err }, "Could not post tournament embed");
    }
  }

  await interaction.reply({
    content: `Tournament **${name}** hosted! ID: ${tournament.id}`,
    embeds: [embed],
    ephemeral: true,
  });

  delete (interaction.client as any).tourneyName;
}

async function handleThreads(interaction: ChatInputCommandInteraction) {
  const [tournament] = await db
    .select()
    .from(tournamentsTable)
    .where(
      and(
        eq(tournamentsTable.guildId, interaction.guildId!),
        eq(tournamentsTable.status, "open")
      )
    )
    .orderBy(tournamentsTable.createdAt)
    .limit(1);

  if (!tournament) {
    await interaction.reply({ content: "No active tournament found.", ephemeral: true });
    return;
  }

  const entries = await db
    .select()
    .from(tournamentEntriesTable)
    .where(eq(tournamentEntriesTable.tournamentId, tournament.id));

  if (entries.length < 2) {
    await interaction.reply({ content: "Not enough entries to create threads.", ephemeral: true });
    return;
  }

  const bracket = generateBracket(entries);
  const [settings] = await db
    .select()
    .from(guildSettingsTable)
    .where(eq(guildSettingsTable.guildId, interaction.guildId!));

  if (!settings?.bracketChannelId) {
    await interaction.reply({ content: "Bracket channel not set. Use `/setup bracket` first.", ephemeral: true });
    return;
  }

  try {
    const bracketChannel = await interaction.client.channels.fetch(settings.bracketChannelId) as TextChannel;
    if (!bracketChannel) {
      await interaction.reply({ content: "Could not find bracket channel.", ephemeral: true });
      return;
    }

    const bracketEmbed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`🏆 ${tournament.name} — Round 1 Bracket`)
      .setDescription(
        bracket
          .map((m, i) => `**Match ${i + 1}:** <@${m.player1Id}> vs <@${m.player2Id}>`)
          .join("\n")
      )
      .setFooter({ text: `Tournament ID: ${tournament.id}` });

    const bracketMsg = await bracketChannel.send({ embeds: [bracketEmbed] });

    await db
      .update(tournamentsTable)
      .set({ bracketChannelId: bracketChannel.id, bracketMessageId: bracketMsg.id, status: "active" })
      .where(eq(tournamentsTable.id, tournament.id));

    for (const match of bracket) {
      const matchEntry = await db.insert(tournamentMatchesTable).values({
        tournamentId: tournament.id,
        round: 1,
        matchNumber: bracket.indexOf(match) + 1,
        player1Id: match.player1Id,
        player1Name: match.player1Name,
        player2Id: match.player2Id,
        player2Name: match.player2Name,
        status: "active",
      }).returning();

      const threadName = `Match ${bracket.indexOf(match) + 1}: ${match.player1Name} vs ${match.player2Name}`;
      const thread = await bracketChannel.threads.create({
        name: threadName,
        autoArchiveDuration: 1440,
      });

      await db
        .update(tournamentMatchesTable)
        .set({ threadId: thread.id })
        .where(eq(tournamentMatchesTable.id, matchEntry[0].id));

      await thread.members.add(match.player1Id);
      await thread.members.add(match.player2Id);

      const threadEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`🏆 ${tournament.name}`)
        .setDescription(`Match ${bracket.indexOf(match) + 1}: <@${match.player1Id}> vs <@${match.player2Id}>\n\nGood luck!`);

      await thread.send({ embeds: [threadEmbed] });
    }

    await interaction.reply({
      content: `Created ${bracket.length} match threads in <#${bracketChannel.id}>!`,
      ephemeral: true,
    });
  } catch (err) {
    logger.error({ err }, "Failed to create threads");
    await interaction.reply({ content: "Failed to create threads. Check permissions.", ephemeral: true });
  }
}

async function handleOver(interaction: ChatInputCommandInteraction) {
  const [tournament] = await db
    .select()
    .from(tournamentsTable)
    .where(
      and(
        eq(tournamentsTable.guildId, interaction.guildId!),
        eq(tournamentsTable.status, "active")
      )
    )
    .orderBy(tournamentsTable.createdAt)
    .limit(1);

  if (!tournament) {
    await interaction.reply({ content: "No active tournament found.", ephemeral: true });
    return;
  }

  const matches = await db
    .select()
    .from(tournamentMatchesTable)
    .where(
      and(
        eq(tournamentMatchesTable.tournamentId, tournament.id),
        eq(tournamentMatchesTable.round, tournament.maxEntries === 8 ? 1 : 2),
      )
    );

  for (const match of matches) {
    if (match.threadId) {
      try {
        const thread = await interaction.client.channels.fetch(match.threadId) as ThreadChannel;
        if (thread) {
          await thread.delete("Round over");
        }
      } catch (err) {
        logger.warn({ err }, "Could not delete thread");
      }
    }
  }

  await db
    .update(tournamentMatchesTable)
    .set({ status: "completed" })
    .where(
      and(
        eq(tournamentMatchesTable.tournamentId, tournament.id),
        eq(tournamentMatchesTable.round, tournament.maxEntries === 8 ? 1 : 2),
      )
    );

  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("🔴 Round Over")
    .setDescription(`All match threads for ${tournament.name} have been closed.\nUse "/update" to advance the bracket.`);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleUpdate(interaction: ChatInputCommandInteraction) {
  const [tournament] = await db
    .select()
    .from(tournamentsTable)
    .where(
      and(
        eq(tournamentsTable.guildId, interaction.guildId!),
        eq(tournamentsTable.status, "active")
      )
    )
    .orderBy(tournamentsTable.createdAt)
    .limit(1);

  if (!tournament) {
    await interaction.reply({ content: "No active tournament found.", ephemeral: true });
    return;
  }

  const lastRound = await db
    .select()
    .from(tournamentMatchesTable)
    .where(eq(tournamentMatchesTable.tournamentId, tournament.id))
    .orderBy(tournamentMatchesTable.round)
    .then((r) => r[r.length - 1]?.round ?? 0);

  const winners = await db
    .select()
    .from(tournamentMatchesTable)
    .where(
      and(
        eq(tournamentMatchesTable.tournamentId, tournament.id),
        eq(tournamentMatchesTable.round, lastRound),
        eq(tournamentMatchesTable.status, "completed")
      )
    );

  const winnerList = winners.map((w) => ({
    id: w.winnerId,
    name: w.winnerName,
  })).filter((w) => w.id);

  if (winnerList.length === 0) {
    await interaction.reply({ content: "No completed matches found for this round.", ephemeral: true });
    return;
  }

  if (winnerList.length === 1) {
    await db
      .update(tournamentsTable)
      .set({ status: "completed", endedAt: new Date() })
      .where(eq(tournamentsTable.id, tournament.id));

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`🏆 ${tournament.name} Winner!`)
      .setDescription(`<@${winnerList[0].id}> (${winnerList[0].name}) is the champion!`);
    await interaction.reply({ embeds: [embed], ephemeral: false });
    return;
  }

  const newBracket = generateBracketFromWinners(winnerList);
  const newRound = lastRound + 1;

  const [settings] = await db
    .select()
    .from(guildSettingsTable)
    .where(eq(guildSettingsTable.guildId, interaction.guildId!));

  if (!settings?.bracketChannelId) return;

  try {
    const bracketChannel = await interaction.client.channels.fetch(settings.bracketChannelId) as TextChannel;
    if (!bracketChannel) return;

    const bracketEmbed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`🏆 ${tournament.name} — Round ${newRound} Bracket`)
      .setDescription(
        newBracket
          .map((m, i) => `**Match ${i + 1}:** ${m.player1Name ? `<@${m.player1Id}>` : "TBD"} vs ${m.player2Name ? `<@${m.player2Id}>` : "TBD"}`)
          .join("\n")
      );

    await bracketChannel.send({ embeds: [bracketEmbed] });

    for (const match of newBracket) {
      if (!match.player1Id || !match.player2Id) continue;

      const matchEntry = await db.insert(tournamentMatchesTable).values({
        tournamentId: tournament.id,
        round: newRound,
        matchNumber: newBracket.indexOf(match) + 1,
        player1Id: match.player1Id,
        player1Name: match.player1Name,
        player2Id: match.player2Id,
        player2Name: match.player2Name,
        status: "active",
      }).returning();

      const threadName = `Round ${newRound} Match ${newBracket.indexOf(match) + 1}: ${match.player1Name} vs ${match.player2Name}`;
      const thread = await bracketChannel.threads.create({
        name: threadName,
        autoArchiveDuration: 1440,
      });

      await db
        .update(tournamentMatchesTable)
        .set({ threadId: thread.id })
        .where(eq(tournamentMatchesTable.id, matchEntry[0].id));

      await thread.members.add(match.player1Id);
      await thread.members.add(match.player2Id);

      const threadEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`🏆 ${tournament.name} — Round ${newRound}`)
        .setDescription(`<@${match.player1Id}> vs <@${match.player2Id}>\nGood luck!`);

      await thread.send({ embeds: [threadEmbed] });
    }

    await interaction.reply({
      content: `Round ${newRound} started with ${newBracket.length} match threads!`,
      ephemeral: true,
    });
  } catch (err) {
    logger.error({ err }, "Failed to update bracket");
    await interaction.reply({ content: "Failed to update bracket.", ephemeral: true });
  }
}

function generateBracket(entries: { userId: string; userName: string }[]) {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  const bracket = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    bracket.push({
      player1Id: shuffled[i]?.userId,
      player1Name: shuffled[i]?.userName,
      player2Id: shuffled[i + 1]?.userId,
      player2Name: shuffled[i + 1]?.userName,
    });
  }
  return bracket;
}

function generateBracketFromWinners(winners: { id: string; name: string }[]) {
  const bracket = [];
  for (let i = 0; i < winners.length; i += 2) {
    bracket.push({
      player1Id: winners[i]?.id,
      player1Name: winners[i]?.name,
      player2Id: winners[i + 1]?.id,
      player2Name: winners[i + 1]?.name,
    });
  }
  return bracket;
}
