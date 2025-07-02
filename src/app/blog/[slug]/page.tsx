
"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BlogPost } from '@/types';
import { PublicLayout } from '@/components/layout/public-layout';
import { useLanguage } from '@/hooks/use-language';
import { Loader2, Calendar, User, ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDate } from '@/lib/date-utils';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const fetchBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  if (!slug || !db) return null;
  const q = query(
    collection(db, "blog"),
    where("slug", "==", slug),
    where("isPublished", "==", true),
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as BlogPost;
};

export default function BlogPostPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: post, isLoading, error } = useQuery<BlogPost | null, Error>({
    queryKey: ['blogPost', slug],
    queryFn: () => fetchBlogPostBySlug(slug),
    enabled: !!slug,
  });

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-center text-destructive">{t('errorFetchingPost')}: {error.message}</p>
        ) : !post ? (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-4">{t('postNotFound')}</h2>
            <p className="text-muted-foreground mb-6">{t('postNotFoundMessage')}</p>
            <Button asChild>
              <Link href="/blog">{t('backToBlog')}</Link>
            </Button>
          </div>
        ) : (
          <article>
            <header className="mb-8">
               <Button variant="ghost" onClick={() => router.back()} className="mb-6 text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToBlog')}
              </Button>
              <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-4 lg:text-5xl">{post.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center"><User className="mr-2 h-4 w-4" /> {post.authorName}</div>
                <div className="flex items-center"><Calendar className="mr-2 h-4 w-4" /> {formatDate(post.createdAt, 'MMMM d, yyyy')}</div>
              </div>
            </header>
            
            {post.imageUrl && (
              <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            <div className="prose prose-slate dark:prose-invert max-w-none prose-lg lg:prose-xl">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
          </article>
        )}
      </div>
    </PublicLayout>
  );
}
