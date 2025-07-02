
"use client";

import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import type { BlogPost } from "@/types";
import { PlusCircle, Edit, Trash2, Loader2, AlertTriangle, ArrowUpDown, FileText, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy as firestoreOrderBy, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useSimpleTable } from '@/hooks/use-simple-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { formatDate } from '@/lib/date-utils';

const blogPostSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  content: z.string().min(10, { message: "Content must be at least 10 characters." }),
  excerpt: z.string().max(200, { message: "Excerpt cannot exceed 200 characters." }).optional(),
  imageUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  isPublished: z.boolean().default(false),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

const BLOG_POSTS_QUERY_KEY = "adminBlogPosts";

const slugify = (text: string) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

const fetchBlogPosts = async (): Promise<BlogPost[]> => {
  if (!db) return []; // Return empty array if db is not configured
  try {
    const q = query(collection(db, "blog"), firestoreOrderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as BlogPost));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.warn("Permission denied fetching blog posts for admin. Check Firestore rules.");
      return []; // Return empty array on permission error to avoid crash
    }
    // Re-throw other errors
    throw error;
  }
};

export default function AdminBlogPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<BlogPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

  const { data: posts = [], isLoading, error } = useQuery<BlogPost[], Error>({
    queryKey: [BLOG_POSTS_QUERY_KEY],
    queryFn: fetchBlogPosts,
    enabled: !!user,
  });

  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: { title: "", content: "", excerpt: "", imageUrl: "", isPublished: false },
  });

  const mutation = useMutation<void, Error, { values: BlogPostFormValues; id?: string }>({
    mutationFn: async ({ values, id }) => {
      if (!user) throw new Error("Authentication required.");

      const postData = {
        ...values,
        slug: slugify(values.title),
        authorName: user.name || "Admin",
        authorId: user.id,
        updatedAt: serverTimestamp(),
      };

      if (id) {
        // Update
        const postRef = doc(db, "blog", id);
        await updateDoc(postRef, postData);
      } else {
        // Create
        await addDoc(collection(db, "blog"), {
          ...postData,
          createdAt: serverTimestamp(),
        });
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [BLOG_POSTS_QUERY_KEY] });
      toast({ title: t('success'), description: id ? t('postUpdatedSuccessfully') : t('postCreatedSuccessfully') });
      setIsFormOpen(false);
      setPostToEdit(null);
      form.reset();
    },
    onError: (err) => {
      toast({ variant: "destructive", title: t('error'), description: err.message });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (postId) => {
      await deleteDoc(doc(db, "blog", postId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BLOG_POSTS_QUERY_KEY] });
      toast({ title: t('success'), description: t('postDeletedSuccessfully') });
      setIsDeleteDialogOpen(false);
      setPostToDelete(null);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: t('error'), description: err.message });
    },
  });

  const { paginatedData, setSearchTerm, searchTerm } = useSimpleTable({
    data: posts,
    rowsPerPage: 10,
    searchKeys: ['title', 'authorName'],
  });

  const openFormForNew = () => {
    setPostToEdit(null);
    form.reset({ title: "", content: "", excerpt: "", imageUrl: "", isPublished: false });
    setIsFormOpen(true);
  };

  const openFormForEdit = (post: BlogPost) => {
    setPostToEdit(post);
    form.reset({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || "",
      imageUrl: post.imageUrl || "",
      isPublished: post.isPublished,
    });
    setIsFormOpen(true);
  };
  
  const openDeleteConfirm = (post: BlogPost) => {
    setPostToDelete(post);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (values: BlogPostFormValues) => {
    mutation.mutate({ values, id: postToEdit?.id });
  };

  if (error) return <p className="text-destructive">{t('errorFetchingPosts')}: {error.message}</p>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">{t('manageBlog')}</h1>
          <Button onClick={openFormForNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('newPost')}
          </Button>
        </div>

        <Input
          placeholder={t('searchPosts')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />

        {isLoading ? <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
          <Card>
            <CardHeader>
              <CardTitle>{t('blogPosts')}</CardTitle>
              <CardDescription>{t('viewAndManageBlogPosts')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>{t('title')}</TableHead><TableHead>{t('status')}</TableHead><TableHead>{t('author')}</TableHead><TableHead>{t('createdAt')}</TableHead><TableHead className="text-right">{t('actions')}</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? paginatedData.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.title}</TableCell>
                      <TableCell><Badge variant={post.isPublished ? 'default' : 'secondary'}>{post.isPublished ? t('published') : t('draft')}</Badge></TableCell>
                      <TableCell>{post.authorName}</TableCell>
                      <TableCell className="text-xs">{formatDate(post.createdAt, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" asChild><Link href={`/blog/${post.slug}`} target="_blank"><BookOpen className="h-4 w-4" /></Link></Button>
                        <Button variant="ghost" size="icon" onClick={() => openFormForEdit(post)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteConfirm(post)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center">{t('noPostsFound')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{postToEdit ? t('editPost') : t('createNewPost')}</DialogTitle><DialogDescription>{t('fillInPostDetails')}</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>{t('title')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="content" render={({ field }) => (<FormItem><FormLabel>{t('content')} ({t('markdownSupported')})</FormLabel><FormControl><Textarea {...field} rows={15} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="excerpt" render={({ field }) => (<FormItem><FormLabel>{t('excerpt')} ({t('optional')})</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('imageUrl')} ({t('optional')})</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://res.cloudinary.com/.../image.png"
                      />
                    </FormControl>
                    <FormDescription>
                      {t('cloudinaryInstruction')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="isPublished" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>{t('publishPost')}</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>{t('cancel')}</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('savePost')}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-destructive" />{t('confirmDeletePostTitle')}</AlertDialogTitle><AlertDialogDescription>{t('confirmDeletePostMessage')}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t('cancel')}</AlertDialogCancel><AlertDialogAction onClick={() => postToDelete && deleteMutation.mutate(postToDelete.id)} className="bg-destructive hover:bg-destructive/90" disabled={deleteMutation.isPending}>{deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('deletePost')}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
