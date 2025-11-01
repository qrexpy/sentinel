import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { Octokit } from '@octokit/rest';
import { Command } from '../types/discord';

export const data = new SlashCommandBuilder()
  .setName('release')
  .setDescription('View GitHub releases')
  .addSubcommand(subcommand =>
    subcommand
      .setName('latest')
      .setDescription('Get the latest release')
      .addStringOption(option =>
        option
          .setName('repo')
          .setDescription('Repository name (owner/repo)')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all releases')
      .addStringOption(option =>
        option
          .setName('repo')
          .setDescription('Repository name (owner/repo)')
          .setRequired(true)
      )
      .addNumberOption(option =>
        option
          .setName('limit')
          .setDescription('Maximum number of releases to show (default: 10)')
          .setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction, octokit: Octokit) {
  const subcommand = interaction.options.getSubcommand();
  const repo = interaction.options.getString('repo')!;
  const [owner, repository] = repo.split('/');

  if (!owner || !repository) {
    return await interaction.reply({
      content: 'Please provide a valid repository name in the format `owner/repo`',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  try {
    if (subcommand === 'latest') {
      const { data: release } = await octokit.repos.getLatestRelease({
        owner,
        repo: repository,
      });

      const embed = new EmbedBuilder()
        .setTitle(`Latest Release: ${release.name || release.tag_name}`)
        .setDescription(release.body ? (release.body.length > 1000 ? release.body.substring(0, 997) + '...' : release.body) : 'No release notes')
        .setColor('#2EA043')
        .addFields(
          { name: 'Tag', value: release.tag_name, inline: true },
          { name: 'Published', value: `<t:${Math.floor(new Date(release.published_at!).getTime() / 1000)}:R>`, inline: true },
          { name: 'Author', value: `[${release.author.login}](${release.author.html_url})`, inline: true },
        )
        .setURL(release.html_url);

      if (release.prerelease) {
        embed.addFields({ name: '⚠️ Prerelease', value: 'This is a prerelease', inline: true });
      }

      if (release.draft) {
        embed.addFields({ name: '📝 Draft', value: 'This is a draft release', inline: true });
      }

      const assets = release.assets;
      if (assets.length > 0) {
        const assetList = assets.slice(0, 5).map(asset => 
          `[${asset.name}](${asset.browser_download_url}) (${formatBytes(asset.size)})`
        ).join('\n');
        embed.addFields({ name: 'Assets', value: assetList });
      }

      const viewButton = new ButtonBuilder()
        .setLabel('View Release')
        .setStyle(ButtonStyle.Link)
        .setURL(release.html_url);

      const downloadButton = new ButtonBuilder()
        .setLabel('Download Latest')
        .setStyle(ButtonStyle.Link)
        .setURL(release.html_url);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(viewButton, downloadButton);

      await interaction.editReply({ embeds: [embed], components: [row] });
    } else if (subcommand === 'list') {
      const limit = Math.min(interaction.options.getNumber('limit') || 10, 25);

      const { data: releases } = await octokit.repos.listReleases({
        owner,
        repo: repository,
        per_page: limit,
      });

      if (releases.length === 0) {
        return await interaction.editReply(`No releases found for ${repo}.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`Releases for ${repo}`)
        .setDescription(`Showing ${releases.length} release${releases.length === 1 ? '' : 's'}`)
        .setColor('#0366d6')
        .setURL(`https://github.com/${repo}/releases`);

      releases.forEach((release, index) => {
        const releaseName = release.name || release.tag_name;
        const prerelease = release.prerelease ? ' ⚠️' : '';
        const draft = release.draft ? ' 📝' : '';
        const date = new Date(release.published_at || release.created_at);
        
        embed.addFields({
          name: `${index + 1}. ${releaseName}${prerelease}${draft}`,
          value: `${release.body ? (release.body.substring(0, 100) + (release.body.length > 100 ? '...' : '')) : 'No release notes'}\n[View Release](${release.html_url}) | <t:${Math.floor(date.getTime() / 1000)}:R>`,
        });
      });

      const viewButton = new ButtonBuilder()
        .setLabel('View All Releases')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://github.com/${repo}/releases`);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(viewButton);

      await interaction.editReply({ embeds: [embed], components: [row] });
    }
  } catch (error: any) {
    console.error('Error fetching releases:', error);
    if (error.status === 404) {
      await interaction.editReply(`Repository ${repo} not found or has no releases.`);
    } else {
      await interaction.editReply('Error fetching release information. Make sure the repository is public.');
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

