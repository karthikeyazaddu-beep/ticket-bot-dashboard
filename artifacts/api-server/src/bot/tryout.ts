import {
  Client,
  Events,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ChannelType,
  TextChannel,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
} from "discord.js";
import { db } from "@workspace/db";
import { guildSettingsTable, tryoutResultsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

export function registerTryoutCommands(client: Client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const cmd = interaction as ChatInputCommandInteraction;
      if (cmd.commandName === "tryout") {
        const sub = cmd.options.getSubcommand();
        if (sub === "result") await handleTryoutResult(cmd);
        if (sub === "setup") await handleTryoutSetup(cmd);
      }
    } else if (interaction.isModalSubmit()) {
      const modal = interaction as ModalSubmitInteraction;
      if (modal.customId === "tryout_result_modal") {
        await handleTryoutModalSubmit(modal);
      }
    }
  });
}

export async function deployTryoutCommands(client: Client) {
  const commands = [
    new SlashCommandBuilder()
      .setName("tryout")
      .setDescription("Tryout management commands")
      .addSubcommand((sub) =>
        sub
          .setName("result")
          .setDescription("Submit a tryout result")
          .addUserOption((opt) =>
            opt.setName("user").setDescription("The user being evaluated").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("setup")
          .setDescription("Configure tryout settings")
          .addChannelOption((opt) =>
            opt.setName("channel").setDescription("Channel to post results in").setRequired(true)
          )
          .addRoleOption((opt) =>
            opt.setName("role1").setDescription("Role allowed to use tryout commands").setRequired(true)
          )
          .addRoleOption((opt) =>
            opt.setName("role2").setDescription("Additional allowed role").setRequired(false)
          )
          .addRoleOption((opt) =>
            opt.setName("role3").setDescription("Additional allowed role").setRequired(false)
          )
      ),
  ];

  const clientId = client.user?.id;
  if (!clientId) return;
  await client.application!.commands.set(commands);
  logger.info("Tryout slash commands deployed");
}

async function handleTryoutSetup(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  const role1 = interaction.options.getRole("role1", true);
  const role2 = interaction.options.getRole("role2")?.id;
  const role3 = interaction.options.getRole("role3")?.id;

  const roles = [role1.id];
  if (role2) roles.push(role2);
  if (role3) roles.push(role3);

  const [settings] = await db
    .insert(guildSettingsTable)
    .values({
      guildId: interaction.guildId!,
      tryoutChannelId: channel.id,
      tryoutRoles: JSON.stringify(roles),
    })
    .onConflictDoUpdate({
      target: guildSettingsTable.guildId,
      set: {
        tryoutChannelId: channel.id,
        tryoutRoles: JSON.stringify(roles),
      },
    })
    .returning();

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("Tryout Settings Configured")
    .addFields(
      { name: "Results Channel", value: `<#${channel.id}>`, inline: true },
      { name: "Allowed Roles", value: roles.map((r) => `<@&${r}>`).join(", "), inline: true }
    )
    .setDescription("Use `/tryout result` to submit a tryout evaluation.");

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTryoutResult(interaction: ChatInputCommandInteraction) {
  const [settings] = await db
    .select()
    .from(guildSettingsTable)
    .where(eq(guildSettingsTable.guildId, interaction.guildId!));

  if (!settings || !settings.tryoutChannelId) {
    await interaction.reply({
      content: "Tryout settings not configured. Run `/tryout setup` first.",
      ephemeral: true,
    });
    return;
  }

  const allowedRoles: string[] = JSON.parse(settings.tryoutRoles || "[]");
  const member = interaction.member;
  const hasRole =
    allowedRoles.length === 0 ||
    allowedRoles.some((roleId) => (member as any).roles?.cache?.has(roleId)) ||
    interaction.guild?.ownerId === interaction.user.id;

  if (!hasRole) {
    await interaction.reply({
      content: "You do not have permission to submit tryout results.",
      ephemeral: true,
    });
    return;
  }

  const targetUser = interaction.options.getUser("user", true);

  const modal = new ModalBuilder()
    .setCustomId("tryout_result_modal")
    .setTitle(`Tryout: ${targetUser.username}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("aim")
          .setLabel("Aim (1-10)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("movement")
          .setLabel("Movement (1-10)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(2)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("skill_level")
          .setLabel("Skill Level (Beginner, Intermediate, Advanced, Pro)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(30)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("rank")
          .setLabel("Rank / Tier")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(50)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("notes")
          .setLabel("Additional Notes")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(1000)
      )
    );

  (interaction as any).client.tryoutTarget = {
    userId: targetUser.id,
    userName: targetUser.username,
    tryouterId: interaction.user.id,
    tryouterName: interaction.user.tag,
    guildId: interaction.guildId!,
    channelId: settings.tryoutChannelId,
  };

  await interaction.showModal(modal);
}

async function handleTryoutModalSubmit(interaction: ModalSubmitInteraction) {
  const data = (interaction.client as any).tryoutTarget;
  if (!data) {
    await interaction.reply({
      content: "Session expired. Please run the command again.",
      ephemeral: true,
    });
    return;
  }

  const aim = interaction.fields.getTextInputValue("aim");
  const movement = interaction.fields.getTextInputValue("movement");
  const skillLevel = interaction.fields.getTextInputValue("skill_level");
  const rank = interaction.fields.getTextInputValue("rank");
  const notes = interaction.fields.getTextInputValue("notes") || "None";

  await db.insert(tryoutResultsTable).values({
    guildId: data.guildId,
    channelId: data.channelId,
    targetUserId: data.userId,
    targetUserName: data.userName,
    tryouterUserId: data.tryouterId,
    tryouterUserName: data.tryouterName,
    aim,
    movement,
    skillLevel,
    rank,
    notes,
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("Tryout Result")
    .setDescription(`**Target:** <@${data.userId}> (${data.userName})\n**Tryouter:** <@${data.tryouterId}> (${data.tryouterName})`)
    .addFields(
      { name: "Aim", value: aim, inline: true },
      { name: "Movement", value: movement, inline: true },
      { name: "Skill Level", value: skillLevel, inline: true },
      { name: "Rank", value: rank, inline: true },
      { name: "Notes", value: notes }
    )
    .setTimestamp();

  try {
    const channel = await interaction.client.channels.fetch(data.channelId) as TextChannel;
    if (channel) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    logger.warn({ err }, "Could not post tryout result to channel");
  }

  await interaction.reply({
    content: `Tryout result for ${data.userName} submitted successfully!`,
    ephemeral: true,
  });

  delete (interaction.client as any).tryoutTarget;
}
