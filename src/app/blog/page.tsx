
"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getDocs, orderBy as firestoreOrderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BlogPost } from '@/types';
import { PublicLayout } from '@/components/layout/public-layout';
import { useLanguage } from '@/hooks/use-language';
import { Loader2, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { formatDualDate } from '@/lib/date-utils';
import { PLACEHOLDER_IMAGE_SIZE } from '@/constants';

const BLOG_POSTS_QUERY_KEY_PUBLIC = "publicBlogPosts";

const fetchPublishedBlogPosts = async (): Promise<BlogPost[]> => {
  if (!db) return [];
  const q = query(
    collection(db, "blog"),
    where("isPublished", "==", true),
    firestoreOrderBy("createdAt", "desc")
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as BlogPost));
};

export default function BlogPage() {
  const { t } = useLanguage();
  const { data: posts, isLoading, error } = useQuery<BlogPost[], Error>({
    queryKey: [BLOG_POSTS_QUERY_KEY_PUBLIC],
    queryFn: fetchPublishedBlogPosts,
  });

  return (
    <PublicLayout>
      <div className="container mx-auto py-12 px-4">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-2">{t('blog')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('blogSubtitle')}</p>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-center text-destructive">{t('errorFetchingPosts')}: {error.message}</p>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <Card key={post.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="relative w-full h-56 bg-muted">
                    <Image
                      src={post.imageUrl || `https://placehold.co/${PLACEHOLDER_IMAGE_SIZE}.png`}
                      alt={post.title}
                      fill
                      className="object-cover"
                      data-ai-hint="blog post"
                    />
                  </div>
                </Link>
                <CardHeader className="p-6">
                  <CardTitle className="text-xl leading-snug">
                    <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">{post.title}</Link>
                  </CardTitle>
                  <CardDescription className="text-xs pt-2 space-y-1">
                     <span className="flex items-center"><User className="mr-2 h-3 w-3" /> {post.authorName}</span>
                     <span className="flex items-center"><Calendar className="mr-2 h-3 w-3" /> {formatDualDate(post.createdAt, 'MMM d, yyyy', 'MMM D, YYYY')}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt || post.content.substring(0, 150) + '...'}</p>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <Button asChild className="w-full">
                    <Link href={`/blog/${post.slug}`}>{t('readMore')}</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-lg text-muted-foreground py-10">{t('noBlogPostsFound')}</p>
        )}
      </div>
    </PublicLayout>
  );
}
