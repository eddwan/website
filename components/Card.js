export default function Footer() {
  return (
    <div className="max-w-md bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md md:max-w-2xl m-4">
      <div className="md:flex md:flex-wrap">
        <div className="md:flex-shrink-0 md:flex-wrap md:h-full md:w-full">
          <img
            className="h-48 w-full object-cover"
            src="https://images.unsplash.com/photo-1515711660811-48832a4c6f69?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=448&q=80"
            alt="Man looking at item at a store"
          />
        </div>
        <div className="p-8">
          <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
            Case study
          </div>
          <a
            href="#"
            className="block mt-1 text-lg leading-tight font-medium text-black hover:underline dark:text-white"
          >
            Finding customers for your new business
          </a>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Getting a new business off the ground is a lot of hard work. Here
            are five ideas you can use to find your first customers.
          </p>
        </div>
      </div>
    </div>
  );
}
