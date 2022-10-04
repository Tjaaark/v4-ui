import { PageHeader } from '@components/Layout/PageHeader'
import classNames from 'classnames'
import React from 'react'
import { Navigation } from './Navigation'

interface LayoutProps {
  className?: string
  backgroundClassName?: string
  children: React.ReactNode
}

const Layout = (props: LayoutProps) => {
  const { children, className, backgroundClassName } = props

  return (
    <div className={classNames(className, backgroundClassName, 'min-h-screen minimal-scrollbar')}>
      <PageHeader />
      <Navigation />
      {/* <AlertBanners /> */}
      {children}
    </div>
  )
}

export default Layout
