// Blog posts data structure
// Each post should have: slug, title, description, date, content, author, readTime

export const blogPosts = [
  {
    slug: 'innovation-has-no-paper-trail',
    title: 'Innovation Has No Paper Trail — That's Why the R&D Process Feels Broken',
    description: 'Most of the real work never gets written down when it happens. It lives in prototypes, commits, whiteboards that make no sense a week later, and Teams or Slack threads that end in a fix no one remembers explaining.',
    date: '2025-01-15',
    author: 'Aird Team',
    readTime: '4 min read',
    keywords: ['R&D tax credit', 'innovation documentation', 'R&D process', 'software development', 'technical documentation', 'innovation capture'],
    content: `Most of the real work never gets written down when it happens.

It lives in prototypes, commits, whiteboards that make no sense a week later, and Teams or Slack threads that end in a fix no one remembers explaining.

When teams are building, they prioritize momentum over narration.

Requirements evolve. Priorities shift. Experiments overlap. Work changes faster than any document can.

Keeping every decision perfectly documented isn't just unrealistic — it's incompatible with how most modern teams move.

## Traditional documentation systems weren't designed for environments where learning happens daily.

By the time anyone has capacity to capture it, the context is gone.

What was once insight becomes inference, and the story turns into guesswork.

The R&D process treats innovation like something that must be proven after the fact — as if true innovation is clean, structured, and timestamped.

It isn't.

For most small and mid-sized teams, innovation is still chaotic and nonlinear. It's a blur of iteration, failure, and discovery.

Even when teams do document well, the claim process still demands translation. The ATO's definition of "new knowledge" requires a retroactive, neatly categorized narrative.

That's why consultants end up doing archaeology — not because they want to, but because the system demands reconstruction.

## The system rewards tidy stories, not the messy reality that created them.

So teams rebuild the same story twice — once to build, and once to prove they built.

It's an enormous distraction from progress, and it still doesn't make anyone audit-proof.

**The solution is not more paperwork. It's a system that captures the story as it unfolds.**

That's what Aird does.`
  }
];

// Helper function to get post by slug
export function getPostBySlug(slug) {
  return blogPosts.find(post => post.slug === slug);
}

// Helper function to get all posts sorted by date (newest first)
export function getAllPosts() {
  return [...blogPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
}
