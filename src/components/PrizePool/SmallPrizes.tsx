import { usePrizePoolExpectedPrizes } from '@hooks/v4/PrizePool/usePrizePoolExpectedPrizes'
import { formatCurrencyNumberForDisplay } from '@pooltogether/utilities'
import { PrizePool } from '@pooltogether/v4-client-js'

/**
 * TODO: Change based on currency selected
 * @param props
 * @returns
 */
export const SmallPrizes = (props: { prizePool: PrizePool }) => {
  const { prizePool } = props
  const { data, isFetched } = usePrizePoolExpectedPrizes(prizePool)
  return isFetched ? (
    <>
      {data?.smallPrizeValueList
        .map((v) => formatCurrencyNumberForDisplay(v, 'usd', { hideZeroes: true }))
        .join(', ')}
    </>
  ) : null
}
