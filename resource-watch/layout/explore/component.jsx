/* eslint-disable react/jsx-no-undef */
import { useState, useMemo, useCallback } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// components
import Layout from 'layout/layout/layout-app';
import Modal from 'components/modal/modal-component';
import ExploreSidebar from 'layout/explore/explore-sidebar';
import ExploreMenu from 'layout/explore/explore-menu';
import ExploreDatasets from 'layout/explore/explore-datasets';
import ExploreMap from 'layout/explore/explore-map';
import ExploreDetail from 'layout/explore/explore-detail';
import ExploreTopics from 'layout/explore/explore-topics';
import ExploreAreasOfInterest from 'layout/explore/explore-areas-of-interest';
import ExploreAreasOfInterestNewArea from 'layout/explore/explore-areas-of-interest-new-area';
import ExploreCollections from 'layout/explore/explore-collections';
import ExploreLogin from 'layout/explore/explore-login';
import ExploreDiscover from 'layout/explore/explore-discover';
import ExploreNearRealTime from 'layout/explore/explore-near-real-time';
import ExploreFavorites from 'layout/explore/explore-favorites';
import ExploreMyData from 'layout/explore/explore-my-data';
import { ResearchChatbot } from 'components/research';

// lib
import { Media } from 'lib/media';

// constants
import { EXPLORE_SECTIONS, EXPLORE_SUBSECTIONS, DATASETS_WITH_SCHEMA } from './constants';

const Explore = (props) => {
  const {
    explore: {
      datasets: { selected },
      sidebar: { section, subsection },
      map: {
        drawer: { isDrawing },
      },
    },
    userIsLoggedIn,
    stopDrawing,
    dataset: datasetData,
  } = props;
  const [mobileWarningOpened, setMobileWarningOpened] = useState(true);
  const [dataset, setDataset] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleClearPolygon = useCallback(() => {
    stopDrawing();
  }, [stopDrawing]);

  const isAuthenticatedSection = useMemo(
    () =>
      [
        EXPLORE_SECTIONS.COLLECTIONS,
        EXPLORE_SECTIONS.FAVORITES,
        EXPLORE_SECTIONS.AREAS_OF_INTEREST,
      ].includes(section),
    [section],
  );

  const getSidebarLayout = () => (
    <>
      {!subsection && !selected && (
        <>
          <ExploreMenu />
          <div className="explore-sidebar-content panel-style" id="sidebar-content-container" key={section}>
            {section === EXPLORE_SECTIONS.ALL_DATA && <ExploreDatasets />}
            {section === EXPLORE_SECTIONS.TOPICS && <ExploreTopics />}
            {section === EXPLORE_SECTIONS.COLLECTIONS && userIsLoggedIn && <ExploreCollections />}
            {section === EXPLORE_SECTIONS.FAVORITES && userIsLoggedIn && <ExploreFavorites />}
            {isAuthenticatedSection && !userIsLoggedIn && <ExploreLogin />}
            {section === EXPLORE_SECTIONS.DISCOVER && <ExploreDiscover />}
            {section === EXPLORE_SECTIONS.NEAR_REAL_TIME && <ExploreNearRealTime />}
            {section === EXPLORE_SECTIONS.AREAS_OF_INTEREST && userIsLoggedIn && (
              <ExploreAreasOfInterest />
            )}
            {section === EXPLORE_SECTIONS.MY_DATA && <ExploreMyData />}
          </div>
        </>
      )}
      {selected && (
        <ExploreDetail key={selected} onDatasetLoaded={(_dataset) => setDataset(_dataset)} />
      )}
      {!selected && subsection === EXPLORE_SUBSECTIONS.NEW_AREA && (
        <ExploreAreasOfInterestNewArea />
      )}
    </>
  );

  const DatasetSchemaScript = useMemo(() => {
    if (!datasetData?.slug || !DATASETS_WITH_SCHEMA.includes(datasetData?.slug)) {
      return null;
    }
    return dynamic(() => import(`scripts/schemas/${datasetData.slug.toLowerCase()}`));
  }, [datasetData]);

  const metadata = dataset?.metadata?.[0];
  const infoObj = metadata?.info;
  const titleSt = selected ? infoObj?.name : '';
  const descriptionSt = selected
    ? infoObj?.functions
    : 'Browse more than 200 global data sets on the state of our planet.';

  return (
    <>
      {/* Research Button */}
      <button
        className="research-btn"
        onClick={() => setIsChatOpen(true)}
      >
        <span>🔍</span>
        <span>Research</span>
      </button>

      <Layout title={titleSt} description={descriptionSt} className="-fullscreen" isFullScreen>
        {DatasetSchemaScript && <DatasetSchemaScript />}
        <Head>
          {datasetData && !datasetData?.published && <meta name="robots" content="noindex, follow" />}
          {datasetData && (
            <link
              rel="canonical"
              href={`https://resourcewatch.org/data/explore/${datasetData.slug}`}
            />
          )}
        </Head>

        <div className="c-page-explore">
          <Media greaterThanOrEqual="md" className="flex flex-1">
            <>
              <ExploreSidebar key={section}>{getSidebarLayout()}</ExploreSidebar>
              {isDrawing && (
                <div className="clear-polygon-container">
                  <button type="button" onClick={handleClearPolygon} className="c-btn -primary -alt">
                    Clear Polygon
                  </button>
                </div>
              )}
              <ExploreMap />
            </>
          </Media>
          <Media at="sm" className="flex flex-1">
            <>
              {getSidebarLayout()}
              <Modal
                isOpen={mobileWarningOpened}
                onRequestClose={() => setMobileWarningOpened(false)}
              >
                <div>
                  <p>
                    The mobile version of Explore has limited functionality, please check the desktop
                    version to have access to the full list of features available.
                  </p>
                </div>
              </Modal>
            </>
          </Media>

          <ResearchChatbot
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      </Layout>
    </>
  );
};

export default Explore;
