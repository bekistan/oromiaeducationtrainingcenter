
import { db } from '../src/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

const seedBlogPosts = async () => {
  if (!db) {
    console.error("Firebase is not configured. Aborting seed.");
    return;
  }
  try {
    const blogRef = collection(db, 'blog');
    console.log('Seeding blog posts...');

    const samplePosts = [
      {
        title: 'Welcome to the Oromia Education Center Blog',
        content: 'This is the first post on our new blog! Here we will share news, updates, and stories from the Oromia Education Research and Training Center. Stay tuned for more content.',
        excerpt: 'An introduction to our new blog. Stay tuned for news and updates.',
        isPublished: true,
        authorName: 'Admin Team',
        authorId: 'system-seed',
        imageUrl: 'https://placehold.co/800x400.png',
        dataAiHint: 'welcome blog post'
      },
      {
        title: 'Upcoming Facility Enhancements (Draft)',
        content: 'We are excited to announce several upcoming enhancements to our facilities. This is a draft post and should not be visible to the public.',
        excerpt: 'A sneak peek at the exciting new changes coming soon.',
        isPublished: false,
        authorName: 'Admin Team',
        authorId: 'system-seed',
        imageUrl: 'https://placehold.co/800x400.png',
        dataAiHint: 'construction blueprint'
      },
    ];

    for (const post of samplePosts) {
      await addDoc(blogRef, {
        ...post,
        slug: slugify(post.title),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`Added blog post: "${post.title}"`);
    }

    console.log('Blog post seeding complete.');
    console.log('You can now see these posts on your public blog page and in the admin dashboard.');
  } catch (error) {
    console.error('Error seeding blog posts:', error);
  }
};

seedBlogPosts();
