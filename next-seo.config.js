const title = 'Eddwan Hallen – Developer, writer, creator.';
const description =
  'Front-end developer, JavaScript enthusiast, and course creator.';

const SEO = {
  title,
  description,
  canonical: 'https://eddwan.com',
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    url: 'https://eddwan.com',
    title,
    description,
    images: [
      {
        url: 'https://eddwan.com/static/images/banner.jpg',
        alt: title,
        width: 1280,
        height: 720
      }
    ]
  },
  twitter: {
    handle: '@leeerob',
    site: '@leeerob',
    cardType: 'summary_large_image'
  }
};

export default SEO;
