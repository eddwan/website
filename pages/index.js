import Container from '../components/Container';
import Card from '@/components/Card';
import NextLink from 'next/link';

export default function Home() {
  return (
    <Container>
      <div className="flex flex-col xl:flex-row xl:px-60 md:mb-16 md:px-60 xl:flex-nowrap md:justify-center">
        <div className="justify-center m-8 xl:m-0">
          <img className="rounded-full shadow-2xl w-96" src="/picture.png" />
        </div>
        <div className="xl:pl-28 md:pl-0 md:pt-12 p-8 justify-center">
          <h1 className="font-extrabold xl:text-left text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white text-center">
            Hi, I'm Eddwan Hallen
          </h1>
          <h2 className="text-gray-600 xl:text-left dark:text-gray-400 text-center">
            I’m a network engineer, developer, writer, and creator. I work at
            Cisco as a Consulting Engineer. You’ve found my personal slice of
            the internet – everything you want to know and more is here.
          </h2>
        </div>
      </div>
      <div className="flex flex-col justify-evenly mb-16 bg-blue-50 dark:bg-gray-600 xl:px-60 md:mb-16 md:px-60 xl:flex-nowrap md:justify-center">
        <div className="flex flex-row justify-between p-8">
          <h1 class="text-xl dark:text-white">Recent posts</h1>
          <NextLink href="/blog">
            <a className="text-gray-900 dark:text-gray-100">View all</a>
          </NextLink>
        </div>

        <div className="flex flex-row flex-wrap">
          <Card />
          <Card />
          <Card />
          <Card />
          <Card />
          <Card />
          <Card />
          <Card />
        </div>
      </div>
    </Container>
  );
}
