import Head from "next/head";
import styles from "./mainLayout.module.css";
import utilStyles from "../styles/utils.module.css";
import Link from "next/link";
import { Layout, Menu, Breadcrumb } from "antd";
const { Header, Footer, Content } = Layout;

const name = "Your Name";
export const siteTitle = "Next.js Sample Website";

export default function MainLayout({ children, home }) {
  return (
    <Layout className={styles.container}>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header className={styles.headerColor}>
        <Menu theme="light" mode="horizontal">
          <Menu.Item key="1">Works</Menu.Item>
          <Menu.Item key="2">Blog</Menu.Item>
          <Menu.Item key="3">Contact</Menu.Item>
        </Menu>
      </Header>
      <Content className={styles.content}>{children}</Content>
      <Footer>Footer</Footer>
    </Layout>
  );
}
