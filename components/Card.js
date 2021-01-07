import Link from 'next/link';

export default function Card({
  slug,
  publishedAt,
  title,
  summary,
  category,
  image
}) {
  return (
    <div className="max-w-md bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md md:max-w-2xl m-4">
      <div className="md:flex md:flex-wrap">
        <div className="md:flex-shrink-0 md:flex-wrap md:h-full md:w-full">
          <img
            className="h-48 w-full object-cover"
            src={image}
            alt="Man looking at item at a store"
          />
        </div>
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
            {category}
          </div>
          <Link href={`/blog/${slug}`}>
            <a className="block mt-1 text-lg leading-tight font-medium text-black hover:underline dark:text-white">
              {title}
            </a>
          </Link>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{summary}</p>
        </div>
      </div>
    </div>
  );
}
