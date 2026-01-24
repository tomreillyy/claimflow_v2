import Link from 'next/link';
import { getAllPosts } from '@/lib/blogPosts';
import { Header } from '@/components/Header';

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Header />

      <main>
        {/* Hero Section */}
        <section style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '120px 24px 80px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: 'clamp(40px, 7vw, 64px)',
            fontWeight: 600,
            lineHeight: 1.1,
            color: 'var(--ink)',
            marginBottom: 16
          }}>
            Blog
          </h1>
          <p style={{
            fontSize: 20,
            color: 'var(--muted)',
            maxWidth: 600,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Insights on R&D documentation, innovation capture, and building better products
          </p>
        </section>

        {/* Blog Posts Grid */}
        <section style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '0 24px 120px'
        }}>
          <div style={{
            display: 'grid',
            gap: 48,
            gridTemplateColumns: '1fr'
          }}>
            {posts.map((post) => (
              <article
                key={post.slug}
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: 48
                }}
              >
                <Link
                  href={`/blog/${post.slug}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  className="blog-post-link"
                >
                  {/* Meta info */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 16,
                    fontSize: 14,
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
                  </div>

                  {/* Title */}
                  <h2 style={{
                    fontSize: 'clamp(28px, 4vw, 36px)',
                    fontWeight: 600,
                    lineHeight: 1.2,
                    color: 'var(--ink)',
                    marginBottom: 16
                  }}>
                    {post.title}
                  </h2>

                  {/* Description */}
                  <p style={{
                    fontSize: 18,
                    color: 'var(--muted)',
                    lineHeight: 1.6,
                    marginBottom: 24
                  }}>
                    {post.description}
                  </p>

                  {/* Read more link */}
                  <span style={{
                    fontSize: 16,
                    fontWeight: 500,
                    color: 'var(--brand)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    Read article
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M6 12L10 8L6 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </Link>
              </article>
            ))}
          </div>
        </section>

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
              Ready to capture your innovation story?
            </h2>
            <p style={{
              fontSize: 18,
              color: 'var(--muted)',
              lineHeight: 1.6,
              marginBottom: 32
            }}>
              Stop reconstructing your R&D work. Start documenting it as it happens.
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
              Get started free
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

// SEO Metadata
export const metadata = {
  title: 'Blog | ClaimFlow - R&D Documentation & Innovation Capture',
  description: 'Insights on R&D documentation, innovation capture, and building better products. Learn how to capture your innovation story as it unfolds.',
  keywords: ['R&D tax credit', 'innovation documentation', 'R&D process', 'software development blog', 'technical documentation', 'innovation management'],
  openGraph: {
    title: 'Blog | ClaimFlow',
    description: 'Insights on R&D documentation, innovation capture, and building better products.',
    type: 'website',
    url: 'https://aird.com.au/blog'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | ClaimFlow',
    description: 'Insights on R&D documentation, innovation capture, and building better products.'
  },
  alternates: {
    canonical: 'https://aird.com.au/blog'
  }
};
