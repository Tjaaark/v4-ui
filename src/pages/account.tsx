import { LoadingScreen } from '@pooltogether/react-components'
import { AccountUI } from '@views/Account'
import { SimpleAccountUI } from '@views/SimpleAccount'
import { isAddress } from 'ethers/lib/utils'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import dynamic from 'next/dynamic.js'
import { useRouter } from 'next/router'
import React, { Suspense } from 'react'
import nextI18NextConfig from '../../next-i18next.config.js'

const Layout = dynamic(() => import('../components/Layout'), {
  suspense: true
})

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'], nextI18NextConfig))
    }
  }
}

export default function IndexPage(props) {
  const router = useRouter()
  const user = router.query.user as string

  if (!!user && isAddress(user)) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Layout backgroundClassName='bg-gradient-to-br from-pt-purple-lightest to-pt-purple-lighter dark:from-gradient-purple dark:to-pt-purple-darkest minimal-scrollbar'>
          <SimpleAccountUI />
        </Layout>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Layout backgroundClassName='bg-gradient-to-br from-pt-purple-lightest to-pt-purple-lighter dark:from-gradient-purple dark:to-pt-purple-darkest minimal-scrollbar'>
        <AccountUI />
      </Layout>
    </Suspense>
  )
}

// export default function IndexPage(props) {
//   const router = useRouter()
//   const user = router.query.user as string

//   if (!!user && isAddress(user)) {
//     return (
//       <Layout>
//         <SimpleAccountUI />
//       </Layout>
//     )
//   }

//   return (
//     <Layout>
//       <AccountUI />
//     </Layout>
//   )
// }
