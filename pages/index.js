import Head from "next/head";
import MainLayout, { siteTitle } from "../components/mainLayout";
import utilStyles from "../styles/utils.module.css";
import {
  Button,
  Layout,
  Card,
  Typography,
  Row,
  Col,
  Space,
  List,
  Tag,
} from "antd";
const { Header, Footer, Sider, Content } = Layout;
export default function Home() {
  return (
    <MainLayout home>
      <Head>
        <title>{siteTitle}</title>
      </Head>
      <section className={utilStyles.section1}>
        <div className={utilStyles.item1}>
          <h2 className={utilStyles.hello}>
            Hi, I am Eddwan, Consulting Engineer
          </h2>
          <p className={utilStyles.helloText}>
            Experienced Software Developer and Collaboration Consulting Engineer
            adept in bringing forth expertise in design, installation, testing
            and maintenance of software systems and platforms.
          </p>
          <Button
            type="primary"
            size="large"
            danger
            className={utilStyles.button}
          >
            Download Resume
          </Button>
        </div>
        <div className={utilStyles.item2}>
          <div className={utilStyles.pictureBack}></div>
          <div className={utilStyles.picture}></div>
        </div>
      </section>
      <section className={utilStyles.section2}>
        <Layout>
          <Header className={utilStyles.postsBack}>
            <Row>
              <Col span={8}>
                <Typography.Text className={utilStyles.recentPostsTitle}>
                  Recent Posts
                </Typography.Text>
              </Col>
              <Col span={8} offset={8} style={{ textAlign: "right" }}>
                <Typography.Link>View All</Typography.Link>
              </Col>
            </Row>
          </Header>
          <Content className={utilStyles.postsBack}>
            <Space>
              <Card hoverable className={utilStyles.postCard}>
                <Space direction="vertical" size="large">
                  <Card.Meta
                    title="Europe Street beat"
                    description={
                      <Row>
                        <Col flex="100px">20 Dez 2020</Col>
                        <Col flex="auto">Programming, Testing</Col>
                      </Row>
                    }
                  />
                  Amet minim mollit non deserunt ullamco est sit aliqua dolor do
                  amet sint. Velit officia consequat duis enim velit mollit.
                  Exercitation veniam consequat sunt nostrud amet.
                </Space>
              </Card>
              <Card hoverable className={utilStyles.postCard}>
                <Space direction="vertical" size="large">
                  <Card.Meta
                    title="Europe Street beat"
                    description={
                      <Row>
                        <Col flex="100px">20 Dez 2020</Col>
                        <Col flex="auto">Programming, Testing</Col>
                      </Row>
                    }
                  />
                  Amet minim mollit non deserunt ullamco est sit aliqua dolor do
                  amet sint. Velit officia consequat duis enim velit mollit.
                  Exercitation veniam consequat sunt nostrud amet.
                </Space>
              </Card>
            </Space>
          </Content>
        </Layout>
      </section>

      <section className={utilStyles.section3}>
        <Layout>
          <Header className={utilStyles.sectionBackground}>
            <Row>
              <Col span={8}>
                <Typography.Text className={utilStyles.sectionTitle}>
                  Featured Works
                </Typography.Text>
              </Col>
              <Col span={8} offset={8} style={{ textAlign: "right" }}>
                <Typography.Link>View All</Typography.Link>
              </Col>
            </Row>
          </Header>
          <Content className={utilStyles.sectionBackground}>
            <List>
              <List.Item>
                <Card
                  hoverable
                  className={utilStyles.featuredCard}
                  bordered={false}
                >
                  <Space size="large">
                    <img src="/Rectangle30.png"></img>
                    <Space direction="vertical" size="large">
                      <Card.Meta
                        title="Europe Street beat"
                        description={
                          <Row>
                            <Col flex="100px">
                              <Tag className={utilStyles.featuredCardTag}>
                                2020
                              </Tag>
                            </Col>
                            <Col flex="auto">Programming, Testing</Col>
                          </Row>
                        }
                      />
                      Amet minim mollit non deserunt ullamco est sit aliqua
                      dolor do amet sint. Velit officia consequat duis enim
                      velit mollit. Exercitation veniam consequat sunt nostrud
                      amet.
                    </Space>
                  </Space>
                </Card>
              </List.Item>
              <List.Item>
                <Card
                  hoverable
                  className={utilStyles.featuredCard}
                  bordered={false}
                >
                  <Space size="large">
                    <img src="/Rectangle30.png"></img>

                    <Space direction="vertical" size="large">
                      <Card.Meta
                        title="Europe Street beat"
                        description={
                          <Row>
                            <Col flex="100px">
                              <Tag className={utilStyles.featuredCardTag}>
                                2020
                              </Tag>
                            </Col>
                            <Col flex="auto">Programming, Testing</Col>
                          </Row>
                        }
                      />
                      Amet minim mollit non deserunt ullamco est sit aliqua
                      dolor do amet sint. Velit officia consequat duis enim
                      velit mollit. Exercitation veniam consequat sunt nostrud
                      amet.
                    </Space>
                  </Space>
                </Card>
              </List.Item>
            </List>
          </Content>
        </Layout>
      </section>
    </MainLayout>
  );
}
