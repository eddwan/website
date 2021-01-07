import Link from 'next/link';
import { NextSeo } from 'next-seo';

import Container from '@/components/Container';

const Talk = ({ title, link, children }) => (
  <>
    <h3 className="font-medium mb-2 text-lg">
      <a
        className="flex items-center text-gray-900 dark:text-gray-100"
        target="_blank"
        rel="noopener noreferrer"
        href={link}
      >
        {title}
        <div>
          <svg
            className="h-4 w-4 ml-1"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </div>
      </a>
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-8">{children}</p>
  </>
);

export default function About() {
  return (
    <Container>
      <NextSeo
        title="About Me – Eddwan Hallen"
        canonical="https://eddwan.com/about"
        openGraph={{
          url: 'https://eddwan.com/about',
          title: 'About Me – Eddwan Hallen'
        }}
      />
      <div className="flex flex-col justify-center items-start max-w-2xl mx-auto mb-16">
        <h1 className="font-bold text-3xl md:text-5xl tracking-tight mb-4 text-black dark:text-white">
          About Me
        </h1>
        <div className="mb-8 prose leading-6 text-gray-600 dark:text-gray-400">
          <p>
            I have a hobby and it is called programming. I like to think how to
            program everything and every time I got myself think what code could
            I write to resolve something. I started my fascination by computers
            when I was 9.
          </p>
          <p>
            Today I have degree in Internet and Computers Networking Technology
            and a post degree in MBA of Project Management. Acting as Consulting
            Engineer for Collaboration Technology sector since 2008 with a huge
            knowledge about Cisco products, specially for Collaboration sector.
            Few years ago I started this blog/page, but I had no chance to
            update it.
          </p>
          <p>
            My plan is, through this blog, share a little bit of my knowledge
            and help others to find some answers I was looking for in the past.
            Here I want to share code snippets, ideas, programming, networking
            and collaboration projects deployments.
          </p>
          <p>
            Let’s see how I can update this page and share different knowledges
            here.
          </p>
        </div>
      </div>
    </Container>
  );
}
