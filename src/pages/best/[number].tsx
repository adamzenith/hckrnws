import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { PageProps } from "~/types/story";
import StoryListItem from "~/components/StoryListItem";
import Head from "next/head";
import { Fragment } from "react";
import { useRouter } from "next/router";
import Pagination from "~/components/Common/Pagination";
import { CenteredText } from "~/components/Common/Fragments";

const BestStoriesList: NextPage<PageProps> = (props: PageProps) => {
  const router = useRouter();
  const { number } = router.query;
  const { data, errorCode } = props;

  if (errorCode)
    return <CenteredText>Oops! Something went wrong :(</CenteredText>;

  if (!data) return <CenteredText>Loading...</CenteredText>;

  const handlePageChange = (page: number) => {
    router.push(`/best/${page}`);
  };

  return (
    <Fragment>
      <Head>
        <title>Best HN - Page {number}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="flex-1">
        {data.map((story) => (
          <StoryListItem story={story} key={story.id} />
        ))}
        <Pagination
          currentPage={parseInt(number as string)}
          onChangePage={handlePageChange}
        />
      </div>
    </Fragment>
  );
};

export const getStaticProps: GetStaticProps = async (context) => {
  const { params } = context;
  const number = params?.number || 1;
  const page = parseInt(number as string);
  const itemsPerPage = 30;
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  try {
    // Get best story IDs from Firebase API
    const bestStoriesResponse = await fetch(
      "https://hacker-news.firebaseio.com/v0/beststories.json"
    );
    const bestStoryIds = await bestStoriesResponse.json();
    
    // Get the slice for current page
    const pageStoryIds = bestStoryIds.slice(startIndex, endIndex);
    
    // Fetch individual story details
    const storyPromises = pageStoryIds.map(async (id: number) => {
      const response = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`
      );
      return response.json();
    });
    
    const stories = await Promise.all(storyPromises);
    
    // Transform to match HNPWA format
    const data = stories.map((story) => {
      let domain = "";
      try {
        if (story.url) {
          domain = new URL(story.url).hostname;
        }
      } catch (e) {
        domain = "";
      }
      
      return {
        id: story.id,
        title: story.title || "",
        url: story.url || "",
        user: story.by || "",
        points: story.score || 0,
        time: story.time || 0,
        comments_count: story.descendants || 0,
        type: story.type || "story",
        domain,
      };
    });

    return {
      props: {
        errorCode: false,
        data,
      },
      revalidate: 3600, // In seconds
    };
  } catch (error) {
    return {
      props: {
        errorCode: 500,
        data: [],
      },
      revalidate: 3600,
    };
  }
};

export const getStaticPaths: GetStaticPaths = async () => {
  // Get the paths we want to pre-render based on posts
  const paths = [...Array(10)].map((x, idx) => ({
    params: { number: (idx + 1).toString() },
  }));

  // We'll pre-render only these paths at build time.
  // { fallback: 'blocking' } will server-render pages
  // on-demand if the path doesn't exist.
  return { paths, fallback: "blocking" };
};

export default BestStoriesList;