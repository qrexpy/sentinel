import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { Octokit } from '@octokit/rest';
import { Command } from '../types/discord';

export const data = new SlashCommandBuilder()
  .setName('issue')
  .setDescription('View and manage GitHub issues')
  .addSubcommand(subcommand =>
    subcommand
      .setName('view')
      .setDescription('View a specific issue')
      .addStringOption(option =>
        option
          .setName('repo')
          .setDescription('Repository name (owner/repo)')
          .setRequired(true)
      )
      .addNumberOption(option =>
        option
          .setName('number')
          .setDescription('Issue number')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List issues in a repository')
      .addStringOption(option =>
        option
          .setName('repo')
          .setDescription('Repository name (owner/repo)')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('state')
          .setDescription('Issue state')
          .setRequired(false)
          .addChoices(
            { name: 'Open', value: 'open' },
            { name: 'Closed', value: 'closed' },
            { name: 'All', value: 'all' }
          )
      )
      .addNumberOption(option =>
        option
          .setName('limit')
          .setDescription('Maximum number of issues to show (default: 10)')
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
    if (subcommand === 'view') {
      const issueNumber = interaction.options.getNumber('number')!;

      const { data: issue } = await octokit.issues.get({
        owner,
        repo: repository,
        issue_number: issueNumber,
      });

      const embed = new EmbedBuilder()
        .setTitle(`Issue #${issue.number}: ${issue.title}`)
        .setDescription(issue.body ? (issue.body.length > 500 ? issue.body.substring(0, 497) + '...' : issue.body) : 'No description')
        .setColor(issue.state === 'open' ? '#2EA043' : '#CB2431')
        .addFields(
          { name: 'State', value: issue.state === 'open' ? '🟢 Open' : '🔴 Closed', inline: true },
          { name: 'Author', value: `[${issue.user?.login}](${issue.user?.html_url})`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(new Date(issue.created_at).getTime() / 1000)}:R>`, inline: true },
          { name: 'Updated', value: `<t:${Math.floor(new Date(issue.updated_at).getTime() / 1000)}:R>`, inline: true },
        )
        .setURL(issue.html_url);

      if (issue.labels.length > 0) {
        const labels = issue.labels.map((label: any) => label.name).join(', ');
        embed.addFields({ name: 'Labels', value: labels, inline: false });
      }

      if (issue.assignees && issue.assignees.length > 0) {
        const assignees = issue.assignees.map(user => user.login).join(', ');
        embed.addFields({ name: 'Assignees', value: assignees, inline: true });
      }

      if (issue.comments > 0) {
        embed.addFields({ name: 'Comments', value: issue.comments.toString(), inline: true });
      }

      const viewButton = new ButtonBuilder()
        .setLabel('View on GitHub')
        .setStyle(ButtonStyle.Link)
        .setURL(issue.html_url);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(viewButton);

      await interaction.editReply({ embeds: [embed], components: [row] });
    } else if (subcommand === 'list') {
      const state = (interaction.options.getString('state') || 'open') as 'open' | 'closed' | 'all';
      const limit = Math.min(interaction.options.getNumber('limit') || 10, 25);

      const { data: issues } = await octokit.issues.listForRepo({
        owner,
        repo: repository,
        state: state === 'all' ? 'all' : state,
        per_page: limit,
      });

      if (issues.length === 0) {
        return await interaction.editReply(`No ${state} issues found in ${repo}.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`${state === 'all' ? 'All' : state.charAt(0).toUpperCase() + state.slice(1)} Issues in ${repo}`)
        .setColor(state === 'open' ? '#2EA043' : state === 'closed' ? '#CB2431' : '#0366d6')
        .setDescription(`Showing ${issues.length} issue${issues.length === 1 ? '' : 's'}`)
        .setURL(`https://github.com/${repo}/issues`);

      issues.forEach(issue => {
        const labels = issue.labels.map((label: any) => label.name).slice(0, 3).join(', ');
        embed.addFields({
          name: `#${issue.number}: ${issue.title}`,
          value: `${issue.state === 'open' ? '🟢' : '🔴'} [View](${issue.html_url})${labels ? ` | Labels: ${labels}` : ''}`,
        });
      });

      const viewButton = new ButtonBuilder()
        .setLabel('View All Issues')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://github.com/${repo}/issues`);

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(viewButton);

      await interaction.editReply({ embeds: [embed], components: [row] });
    }
  } catch (error: any) {
    console.error('Error fetching issues:', error);
    if (error.status === 404) {
      await interaction.editReply(`Repository ${repo} not found or issue doesn't exist.`);
    } else {
      await interaction.editReply('Error fetching issue information. Make sure the repository is public.');
    }
  }
}

