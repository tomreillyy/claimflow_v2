import Link from 'next/link';
import { getPostBySlug, getAllPosts } from '@/lib/blogPosts';
import { Header } from '@/components/Header';

export default function BlogPostPage({ params }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return (
      <>
        <Header />
        <main style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '120px 24px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 16
          }}>
            Post not found
          </h1>
          <Link
            href="/blog"
            style={{
              color: 'var(--brand)',
              fontSize: 18,
              textDecoration: 'none'
            }}
          >
            ← Back to blog
          </Link>
        </main>
      </>
    );
  }

  // Convert content to paragraphs and headings
  const renderContent = (content) => {
    const lines = content.split('\n\n');
    return lines.map((line, index) => {
      // Heading
      if (line.startsWith('## ')) {
        return (
          <h2 key={index} style={{
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'var(--ink)',
            marginTop: 48,
            marginBottom: 24
          }}>
            {line.replace('## ', '')}
          </h2>
        );
      }
      // Bold paragraph
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={index} style={{
            fontSize: 20,
            lineHeight: 1.7,
            color: 'var(--ink)',
            marginBottom: 24,
            fontWeight: 600
          }}>
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      // Regular paragraph
      return (
        <p key={index} style={{
          fontSize: 18,
          lineHeight: 1.7,
          color: 'var(--muted)',
          marginBottom: 24
        }}>
          {line}
        </p>
      );
    });
  };

  return (
    <>
      <Header />

      <main>
        {/* Back to blog link */}
        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '32px 24px 0'
        }}>
          <Link
            href="/blog"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--muted)',
              textDecoration: 'none',
              fontSize: 16,
              transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            className="back-link"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to blog
          </Link>
        </div>

        {/* Article Header */}
        <article>
          <header style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '48px 24px 0'
          }}>
            {/* Meta info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 24,
              fontSize: 15,
              color: 'var(--muted)'
            }}>
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString('en-AU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
              <span>•</span>
              <span>{post.readTime}</span>
              <span>•</span>
              <span>{post.author}</span>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 'clamp(32px, 6vw, 52px)',
              fontWeight: 600,
              lineHeight: 1.1,
              color: 'var(--ink)',
              marginBottom: 24
            }}>
              {post.title}
            </h1>

            {/* Description */}
            <p style={{
              fontSize: 20,
              lineHeight: 1.6,
              color: 'var(--muted)',
              paddingBottom: 48,
              borderBottom: '1px solid var(--line)'
            }}>
              {post.description}
            </p>
          </header>

          {/* Article Content */}
          <div style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '48px 24px 80px'
          }}>
            {renderContent(post.content)}
          </div>
        </article>

        {/* CTA Section */}
        <section style={{
          background: 'var(--bg-soft)',
          borderTop: '1px solid var(--line)',
          padding: '80px 24px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: 600,
            margin: '0 auto'
          }}>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'var(--ink)',
              marginBottom: 16
            }}>
              Stop reconstructing. Start documenting.
            </h2>
            <p style={{
              fontSize: 18,
              color: 'var(--muted)',
              lineHeight: 1.6,
              marginBottom: 32
            }}>
              ClaimFlow captures your innovation story as it unfolds — no archaeology required.
            </p>
            <Link
              href="/admin/new-project"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: 'var(--brand)',
                color: 'white',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontSize: 16,
                fontWeight: 500,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              className="cta-button"
            >
              Try ClaimFlow free
            </Link>
          </div>
        </section>

        {/* Related Posts / More Articles */}
        <section style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '80px 24px 120px'
        }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 32,
            textAlign: 'center'
          }}>
            More articles
          </h2>
          <div style={{
            display: 'flex',
            justifyContent: 'center'
          }}>
            <Link
              href="/blog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                color: 'var(--ink)',
                textDecoration: 'none',
                fontSize: 16,
                fontWeight: 500,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: 'white'
              }}
              className="view-all-link"
            >
              View all articles
            </Link>
          </div>
        </section>
      </main>

      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: {
              '@type': 'Organization',
              name: post.author
            },
            publisher: {
              '@type': 'Organization',
              name: 'ClaimFlow',
              logo: {
                '@type': 'ImageObject',
                url: 'https://aird.com.au/logo.png'
              }
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://aird.com.au/blog/${post.slug}`
            },
            keywords: post.keywords.join(', ')
          })
        }}
      />
    </>
  );
}

// Generate metadata for each blog post dynamically
export function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Post Not Found | ClaimFlow',
      description: 'The blog post you are looking for could not be found.'
    };
  }

  return {
    title: `${post.title} | ClaimFlow Blog`,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      url: `https://aird.com.au/blog/${post.slug}`
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description
    },
    alternates: {
      canonical: `https://aird.com.au/blog/${post.slug}`
    }
  };
}

// Generate static params for all blog posts (for static generation)
export function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug
  }));
}
