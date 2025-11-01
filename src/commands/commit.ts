import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { Octokit } from '@octokit/rest';
import { Command } from '../types/discord';

export const data = new SlashCommandBuilder()
  .setName('commit')
  .setDescription('View commit information')
  .addStringOption(option =>
    option
      .setName('repo')
      .setDescription('Repository name (owner/repo)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('sha')
      .setDescription('Commit SHA (full or short)')
      .setRequired(false)
  )
  .addStringOption(option =>
    option
      .setName('branch')
      .setDescription('Branch name (default: default branch)')
      .setRequired(false)
  )
  .addNumberOption(option =>
    option
      .setName('limit')
      .setDescription('Number of recent commits to show (default: 5, max: 10)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction, octokit: Octokit) {
  const repo = interaction.options.getString('repo')!;
  const sha = interaction.options.getString('sha');
  const branch = interaction.options.getString('branch');
  const limit = interaction.options.getNumber('limit');

  const [owner, repository] = repo.split('/');

  if (!owner || !repository) {
    return await interaction.reply({
      content: 'Please provide a valid repository name in the format `owner/repo`',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  try {
    if (sha) {
      // View specific commit
      const { data: commit } = await octokit.repos.getCommit({
        owner,
        repo: repository,
        ref: sha,
      });

      const embed = new EmbedBuilder()
        .setTitle(`Commit: ${commit.commit.message.split('\n')[0]}`)
        .setDescription(commit.commit.message.split('\n').slice(1).join('\n') || 'No additional message')
        .setColor('#0366d6')
        .addFields(
          { name: 'SHA', value: `\`${commit.sha.substring(0, 7)}\``, inline: true },
          { name: 'Author', value: `[${commit.commit.author.name}](${commit.author?.html_url || '#'})`, inline: true },
          { name: 'Committed', value: `<t:${Math.floor(new Date(commit.commit.author.date).getTime() / 1000)}:R>`, inline: true },
          { name: 'Files Changed', value: commit.files?.length.toString() || '0', inline: true },
          { name: 'Additions', value: `+${commit.stats?.additions || 0}`, inline: true },
          { name: 'Deletions', value: `-${commit.stats?.deletions || 0}`, inline: true },
        )
        .setURL(commit.html_url);

      if (commit.files && commit.files.length > 0) {
        const fileList = commit.files.slice(0, 10).map(file => {
          const status = file.status === 'added' ? '➕' : file.status === 'removed' ? '➖' : '✏️';
          return `${status} ${file.filename} (${file.changes} changes)`;
        }).join('\n');
        embed.addFields({
          name: 'Files Changed',
          value: fileList.length > 1024 ? fileList.substring(0, 1021) + '...' : fileList,
        });
      }

      const viewButton = new ButtonBuilder()
        .setLabel('View on GitHub')
        .setStyle(ButtonStyle.Link)
        .setURL(commit.html_url);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(viewButton);

      await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
      // List recent commits
      const branchName = branch || (await octokit.repos.get({ owner, repo: repository })).data.default_branch;
      const commitLimit = Math.min(limit || 5, 10);

      const { data: commits } = await octokit.repos.listCommits({
        owner,
        repo: repository,
        sha: branchName,
        per_page: commitLimit,
      });

      if (commits.length === 0) {
        return await interaction.editReply(`No commits found in ${repo} on branch ${branchName}.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`Recent Commits in ${repo}`)
        .setDescription(`Branch: \`${branchName}\`\nShowing ${commits.length} commit${commits.length === 1 ? '' : 's'}`)
        .setColor('#0366d6')
        .setURL(`https://github.com/${repo}/commits/${branchName}`);

      commits.forEach((commit, index) => {
        const message = commit.commit.message.split('\n')[0];
        const author = commit.commit.author.name;
        const date = new Date(commit.commit.author.date);
        const shortSha = commit.sha.substring(0, 7);

        embed.addFields({
          name: `${index + 1}. ${shortSha}: ${message.length > 50 ? message.substring(0, 47) + '...' : message}`,
          value: `By ${author} • <t:${Math.floor(date.getTime() / 1000)}:R>\n[View](${commit.html_url})`,
        });
      });

      const viewButton = new ButtonBuilder()
        .setLabel('View All Commits')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://github.com/${repo}/commits/${branchName}`);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(viewButton);

      await interaction.editReply({ embeds: [embed], components: [row] });
    }
  } catch (error: any) {
    console.error('Error fetching commits:', error);
    if (error.status === 404) {
      await interaction.editReply(`Repository ${repo} not found or commit doesn't exist.`);
    } else {
      await interaction.editReply('Error fetching commit information. Make sure the repository is public.');
    }
  }
}

