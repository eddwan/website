import Container from '@/components/Container';
import Card from '@/components/Card';
import NextLink from 'next/link';
import { NextSeo } from 'next-seo';
import { getAllFilesFrontMatter } from '@/lib/mdx';
import Subscribe from '../components/Subscribe';
import Timeline from '../components/Timeline';

export default function Home({ posts }) {
  return (
    <Container>
      <NextSeo
        title="Home - Eddwan Hallen"
        description={`Here's what tech I'm currently using for coding, videos, and music.`}
        canonical="https://eddwan.com"
      />
      <div className="flex flex-col xl:flex-row xl:px-60 md:mb-16 md:px-60 xl:flex-nowrap md:justify-center">
        <div className="justify-center m-8 xl:m-0">
          <img className="rounded-full shadow-2xl w-96" src="/picture.png" />
        </div>
        <div className="flex flex-col xl:pl-28 md:pl-0 md:pt-12 p-8 justify-center space-y-8">
          <h1 className="font-extrabold xl:text-left text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white text-center">
            Hi, I'm Eddwan Hallen
          </h1>
          <h2 className="text-gray-600 xl:text-left dark:text-gray-400 text-center">
            I’m a network engineer, developer, writer, and creator. I work at
            Cisco as a Consulting Engineer. You’ve found my personal slice of
            the internet – everything you want to know and more is here.
          </h2>
          <div>
            <NextLink href="/Resume-Eddwan-Hallen.pdf">
              <button
                type="button"
                className="w-full inline-flex justify-center border border-transparent shadow-sm px-4 py-2 bg-red-500 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Download Resumé
              </button>
            </NextLink>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-evenly mb-16 bg-blue-50 dark:bg-gray-600 xl:px-60 md:mb-16 md:px-60 xl:flex-nowrap md:justify-center">
        <div className="flex flex-row justify-between p-4 pt-8 2xl:px-28">
          <h2 className="text-xl text-black font-light dark:text-white">
            Recent posts
          </h2>
          <NextLink href="/blog">
            <a className="text-gray-900 dark:text-gray-100 text-blue-400 hover:text-blue-600 dark:hover:text-yellow-600">
              View all
            </a>
          </NextLink>
        </div>

        <div className="flex flex-row flex-wrap justify-center">
          {posts
            .sort(
              (a, b) =>
                Number(new Date(b.publishedAt)) -
                Number(new Date(a.publishedAt))
            )
            .slice(0, 8)
            .map((frontMatter) => (
              <Card key={frontMatter.title} {...frontMatter} />
            ))}
        </div>
      </div>
      <div className="flex flex-col xl:flex-row xl:px-60 md:mb-16 md:px-60 xl:flex-nowrap md:justify-center">
        <div className="justify-center m-8 xl:m-0">
          <Subscribe />
        </div>
      </div>
    </Container>
  );
}

export async function getStaticProps() {
  const posts = await getAllFilesFrontMatter('blog');

  return { props: { posts } };
}
