import React, { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/router'
import {
  BlockExplorerLink,
  ErrorsBox,
  Modal,
  SquareButton,
  SquareButtonTheme,
  ThemedClipSpinner,
  poolToast,
  SquareButton
} from '@pooltogether/react-components'
// import { TextInputGroup } from '@pooltogether/react-components'
import {
  useUsersAddress,
  useOnboard,
  useTransaction,
  useSendTransaction
} from '@pooltogether/hooks'
import { getMaxPrecision, numberWithCommas, safeParseUnits, shorten } from '@pooltogether/utilities'
import ControlledTokenAbi from '@pooltogether/pooltogether-contracts/abis/ControlledToken'
import PrizePoolAbi from '@pooltogether/pooltogether-contracts/abis/PrizePool'

import { CONTENT_PANE_STATES } from 'lib/components/DefaultPage'
import { FormStepper } from 'lib/components/FormStepper'
import { TextInputGroup } from 'lib/components/TextInputGroup'
import { RectangularInput } from 'lib/components/TextInputs'
import { MaxAmountTextInputRightLabel } from 'lib/components/MaxAmountTextInputRightLabel'
import { TokenSymbolAndIcon } from 'lib/components/TokenSymbolAndIcon'
import { DownArrow } from 'lib/components/DownArrow'
import { usePoolChainId } from 'lib/hooks/usePoolChainId'

import SuccessIcon from 'assets/images/success@2x.png'

export const DEPOSIT_STATES = {
  approving: 1,
  depositing: 2,
  confirming: 3,
  complete: 4
}

export const Deposit = (props) => {
  const {
    underlyingToken,
    usersUnderlyingBalance,
    usersTokenAllowance,
    tokenAllowancesRefetch,
    tokenSymbol,
    tokenAddress,
    ticketAddress,
    contractAddress,
    form
  } = props

  const router = useRouter()

  const usersAddress = useUsersAddress()

  const [showConfirmModal, setShowConfirmModal] = useState(router.query.showConfirmModal, false)

  const { t } = useTranslation()

  const sendTx = useSendTransaction(t, poolToast)

  const [approveTxId, setApproveTxId] = useState(0)
  const approveTx = useTransaction(approveTxId)

  const [depositTxId, setDepositTxId] = useState(0)
  const depositTx = useTransaction(depositTxId)

  const depositTxInFlight = !depositTx?.cancelled && !depositTx?.completed && depositTx?.sent
  const approveTxInFlight = !approveTx?.cancelled && !approveTx?.completed && approveTx?.sent

  const depositTxSuccess = router.query.success

  const { setValue } = form

  // Set quantity from the query parameter
  useEffect(() => {
    const queryQuantity = router.query.quantity
    if (queryQuantity) {
      setValue('quantity', queryQuantity, { shouldValidate: true })
    }
  }, [])

  const quantity = form.watch('quantity') || ''
  const quantityBN = safeParseUnits(quantity || '0', underlyingToken.decimals)
  const quantityFormatted = numberWithCommas(quantity)

  const needsApproval = quantityBN?.gte(0) && usersTokenAllowance?.lte(quantityBN)

  const [activeStep, setActiveStep] = useState(DEPOSIT_STATES.approving)

  useEffect(() => {
    if (needsApproval) {
      setActiveStep(DEPOSIT_STATES.approving)
    } else {
      setActiveStep(DEPOSIT_STATES.depositing)
    }
  }, [needsApproval])

  useEffect(() => {
    if (showConfirmModal || depositTxInFlight) {
      setActiveStep(DEPOSIT_STATES.confirming)
    }
  }, [showConfirmModal, depositTxInFlight])

  useEffect(() => {
    if (depositTxSuccess) {
      setActiveStep(DEPOSIT_STATES.complete)
    }
  }, [depositTxSuccess])

  const closeModal = () => {
    const { query, pathname } = router
    delete query.showConfirmModal
    router.replace({ pathname, query })
    setShowConfirmModal(false)
  }

  const onDepositTxSuccess = () => {
    const { query, pathname } = router
    query.success = '1'
    router.replace({ pathname, query })
  }

  const handleApprove = async () => {
    const params = [
      contractAddress,
      ethers.utils.parseUnits('9999999999', Number(underlyingToken.decimals))
    ]

    const name = t(`allowTickerPool`, { ticker: tokenSymbol })

    const txId = await sendTx({
      name,
      contractAbi: ControlledTokenAbi,
      contractAddress: tokenAddress,
      method: 'approve',
      params,
      callbacks: {
        refetch: tokenAllowancesRefetch
      }
    })
    setApproveTxId(txId)
  }

  const handleConfirmClick = async (e) => {
    e.preventDefault()

    const params = [usersAddress, quantityBN, ticketAddress, ethers.constants.AddressZero]

    const name = `${t('deposit')} ${quantityFormatted} ${tokenSymbol}`

    // const id = await sendTx(txName, PrizePoolAbi, poolAddress, method, params)

    const txId = await sendTx({
      name,
      contractAbi: PrizePoolAbi,
      contractAddress,
      method: 'depositTo',
      params,
      callbacks: {
        onSent: closeModal,
        onSuccess: onDepositTxSuccess,
        refetch: tokenAllowancesRefetch
      }
    })
    setDepositTxId(txId)
  }

  const txs = {
    approveTx,
    depositTx,
    approveTxInFlight,
    depositTxInFlight,
    depositTxSuccess
  }

  const quantityDetails = {
    quantity,
    quantityBN,
    quantityFormatted
  }

  const resetState = () => {
    const { query, pathname } = router
    delete query.success
    delete query.prevUnderlyingBalance
    delete query.prevTicketBalance
    delete query.quantity
    router.replace({ pathname, query })

    setActiveStep(DEPOSIT_STATES.depositing)
  }

  return (
    <>
      {depositTxSuccess ? (
        <SuccessPane {...props} resetState={resetState} />
      ) : (
        <>
          <ConfirmModal
            {...props}
            isOpen={showConfirmModal}
            quantityDetails={quantityDetails}
            closeModal={closeModal}
            handleConfirmClick={handleConfirmClick}
          />

          <DepositForm
            {...props}
            form={form}
            txs={txs}
            needsApproval={needsApproval}
            quantityDetails={quantityDetails}
            usersUnderlyingBalance={usersUnderlyingBalance}
            showConfirmModal={showConfirmModal}
            setShowConfirmModal={setShowConfirmModal}
            handleApprove={handleApprove}
          />
        </>
      )}

      <GradientBanner
        {...props}
        approveTxInFlight={approveTxInFlight}
        depositTxInFlight={depositTxInFlight}
        depositTxSuccess={depositTxSuccess}
        depositTx={depositTx}
        approveTx={approveTx}
      />

      <FormStepper activeStep={activeStep} tokenSymbol={tokenSymbol} />
    </>
  )
}

const SuccessPane = (props) => {
  const { resetState, tokenSymbol, setSelected } = props

  const { t } = useTranslation()
  const router = useRouter()

  const quantity = router.query.quantity || ''

  return (
    <>
      <img src={SuccessIcon} className='h-16' />

      <p className='font-inter max-w-xs mx-auto opacity-80 text-center text-xl mt-4'>
        {t('successfullyDeposited', { amount: quantity, ticker: tokenSymbol })}
      </p>
      <p className='font-inter font-semibold max-w-xs mx-auto text-center text-3xl'>
        {quantity} {tokenSymbol}
      </p>

      <SquareButton
        className='w-full mt-10'
        theme={SquareButtonTheme.tealOutline}
        onClick={(e) => {
          e.preventDefault()
          resetState()
        }}
      >
        {t('depositMoreToIncreaseOdds', 'Deposit more to increase odds')}
      </SquareButton>
      <button
        onClick={(e) => {
          e.preventDefault()
          resetState()
          setSelected(CONTENT_PANE_STATES.account)
        }}
        className='font-inter text-xxxs py-1 mt-1 text-center text-accent-1 hover:text-highlight-1 trans opacity-60 hover:opacity-100'
      >
        {t('viewYourAccount', 'View your account')}
      </button>
    </>
  )
}

const DepositForm = (props) => {
  const {
    form,
    txs,
    needsApproval,
    tokenAddress,
    tokenSymbol,
    underlyingToken,
    quantityDetails,
    usersTicketBalance,
    usersUnderlyingBalance,
    userHasUnderlyingBalance,
    handleApprove,
    showConfirmModal,
    setShowConfirmModal,
    tokenAllowancesIsFetched
  } = props

  const chainId = usePoolChainId()

  const { depositTxInFlight, approveTxInFlight } = txs
  const { quantity, quantityBN, quantityFormatted } = quantityDetails

  const { t } = useTranslation()

  const { isWalletConnected, connectWallet } = useOnboard()

  const {
    handleSubmit,
    register,
    formState: { errors, isValid, isDirty },
    setValue,
    trigger
  } = form

  const router = useRouter()

  const onSubmit = (values) => {
    setReviewDeposit(values)
  }

  const setReviewDeposit = (values) => {
    const { query, pathname } = router
    const { quantity } = values

    query.quantity = quantity
    query.prevUnderlyingBalance = props.usersUnderlyingBalance
    query.prevTicketBalance = props.usersTicketBalance
    query.showConfirmModal = '1'

    router.replace({ pathname, query })
    setShowConfirmModal(true)
  }

  const usersAddress = useUsersAddress()

  const depositValidationRules = {
    isValid: (v) => {
      const isNotANumber = isNaN(v)
      if (isNotANumber) return false

      const decimals = underlyingToken.decimals
      const quantityBN = safeParseUnits(v, decimals)

      if (isWalletConnected) {
        if (!usersUnderlyingBalance) return false
        if (!usersTicketBalance) return false
        if (quantityBN && safeParseUnits(usersUnderlyingBalance, decimals).lt(quantityBN))
          return t('insufficientFunds')
      }

      if (getMaxPrecision(v) > decimals) return false
      if (quantityBN && quantityBN.isZero()) return false
      return true
    }
  }

  // If the user input a larger amount than their wallet balance before connecting a wallet
  useEffect(() => {
    trigger('quantity')
  }, [usersAddress, usersUnderlyingBalance])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='w-full'>
      <div className='w-full mx-auto'>
        <TextInputGroup
          unsignedNumber
          readOnly={depositTxInFlight}
          Input={RectangularInput}
          type='number'
          symbolAndIcon={
            <TokenSymbolAndIcon chainId={chainId} address={tokenAddress} symbol={tokenSymbol} />
          }
          validate={depositValidationRules}
          containerBgClassName={'bg-transparent'}
          containerRoundedClassName={'rounded-lg'}
          bgClassName={'bg-body'}
          placeholder='0.0'
          id='quantity'
          name='quantity'
          autoComplete='off'
          register={register}
          required={t('ticketQuantityRequired')}
          rightLabel={
            <MaxAmountTextInputRightLabel
              valueKey='quantity'
              disabled={false}
              setValue={setValue}
              amount={usersUnderlyingBalance}
              tokenSymbol={tokenSymbol}
              isAmountZero={!userHasUnderlyingBalance}
            />
          }
          label={
            <div className='font-inter font-semibold uppercase text-accent-3 opacity-60'>
              {t('depositTicker', { ticker: tokenSymbol })}
            </div>
          }
        />
      </div>

      <DownArrow />

      <div className='w-full mx-auto'>
        <TextInputGroup
          readOnly
          disabled
          symbolAndIcon='PRZUSDC'
          Input={RectangularInput}
          roundedClassName={'rounded-lg'}
          containerRoundedClassName={'rounded-lg'}
          bgClassName={'bg-readonly-tsunami'}
          bgVarName='var(--color-bg-readonly-tsunami)'
          placeholder='0.0'
          id='result'
          name='result'
          register={register}
          label={null}
          value={form.watch('quantity') || ''}
        />
      </div>

      <ErrorsBox errors={isDirty ? errors : null} />

      <DynamicBottomButton
        className='mt-2 w-full'
        isDepositDisabled={(!isValid && isDirty) || depositTxInFlight}
        isApproveDisabled={approveTxInFlight}
        isDepositTxInFlight={depositTxInFlight}
        isApproveTxInFlight={approveTxInFlight}
        isWalletConnected={isWalletConnected}
        needsApproval={needsApproval}
        handleApprove={handleApprove}
        usersUnderlyingBalance={usersUnderlyingBalance}
        quantityBN={quantityBN}
        tokenAllowancesIsFetched={tokenAllowancesIsFetched}
        tokenSymbol={tokenSymbol}
      />
    </form>
  )
}

const DynamicBottomButton = (props) => {
  const { isWalletConnected, needsApproval } = props

  if (!isWalletConnected) {
    return <ConnectWalletButton {...props} />
  }

  if (isWalletConnected && needsApproval) {
    return <ApproveButton {...props} />
  }

  return <DepositButton {...props} />
}

const ConnectWalletButton = (props) => {
  const { className } = props
  const { connectWallet } = useOnboard()
  const { t } = useTranslation()
  return (
    <SquareButton className={className} onClick={connectWallet} type='button'>
      {t('connectWalletToDeposit')}
    </SquareButton>
  )
}

const ApproveButton = (props) => {
  const { className, tokenSymbol, isApproveTxInFlight, handleApprove, isApproveDisabled } = props
  const { t } = useTranslation()

  return (
    <TransactionButton
      disabled={isApproveDisabled}
      onClick={handleApprove}
      className={className}
      inFlight={isApproveTxInFlight}
      label={t('allowPoolTogetherToUseTicker', { ticker: tokenSymbol })}
      inFlightLabel={t('allowingPoolTogetherToUseTicker', { ticker: tokenSymbol })}
      type='button'
    />
  )
}

const DepositButton = (props) => {
  const {
    isWalletConnected,
    className,
    tokenSymbol,
    isDepositTxInFlight,
    isDepositDisabled,
    usersUnderlyingBalance,
    quantityBN,
    tokenAllowancesIsFetched
  } = props
  const { t } = useTranslation()

  let label
  if (
    isWalletConnected &&
    usersUnderlyingBalance &&
    quantityBN &&
    safeParseUnits(usersUnderlyingBalance)?.lt(quantityBN)
  ) {
    label = t('insufficientTickerBalance', { ticker: tokenSymbol })
  } else if (isWalletConnected && quantityBN?.isZero()) {
    label = t('enterAnAmountToDeposit')
  } else if (isWalletConnected && !tokenAllowancesIsFetched) {
    label = <ThemedClipSpinner className='mx-auto' />
  } else {
    label = t('reviewDeposit')
  }

  return (
    <TransactionButton
      disabled={isDepositDisabled}
      className={className}
      inFlight={isDepositTxInFlight}
      label={label}
      inFlightLabel={t('depositingAmountTicker', { ticker: tokenSymbol })}
      type='submit'
    />
  )
}

const TransactionButton = (props) => {
  const { onClick, label, inFlight, inFlightLabel, className, type, disabled } = props

  if (inFlight) {
    return (
      <SquareButton disabled onClick={onClick} type={type} className={className}>
        <ThemedClipSpinner className='mr-2' size={16} />
        {inFlightLabel}
      </SquareButton>
    )
  }

  return (
    <SquareButton disabled={disabled} onClick={onClick} type={type} className={className}>
      {label}
    </SquareButton>
  )
}

const TxStatus = (props) => {
  const { t } = useTranslation()

  return (
    <div className='flex justify-between items-center w-2/3 mx-auto'>
      <div>
        {t('status')} <span className='font-semibold'>Pending ...</span>
      </div>
      <div>
        {t('explorer')}{' '}
        <BlockExplorerLink className='text-xxxs' chainId={props.chainId} txHash={props.txHash}>
          <span className='font-semibold'>{shorten(props.txHash)}</span>
        </BlockExplorerLink>
      </div>
    </div>
  )
}

const GradientBanner = (props) => {
  const { approveTxInFlight, depositTxInFlight, depositTx, depositTxSuccess, approveTx } = props
  const { t } = useTranslation()

  let contents = null
  if (depositTxSuccess) {
    contents = t('disclaimerComeBackRegularlyToClaimWinnings')
  } else {
    if (depositTxInFlight) {
      contents = <TxStatus {...props} txHash={depositTx.hash} />
    } else if (approveTxInFlight) {
      contents = <TxStatus {...props} txHash={approveTx.hash} />
    } else {
      contents = t('chancesToWinAreProportional')
    }
  }

  return (
    <div className='w-full font-inter gradient-new text-center px-2 xs:px-4 py-1 mt-4 text-xxxs rounded-lg text-white'>
      {contents}
    </div>
  )
}

const ConfirmModal = (props) => {
  const { handleConfirmClick, quantityDetails, tokenAddress, tokenSymbol } = props
  const { quantity, quantityFormatted } = quantityDetails

  const chainId = usePoolChainId()

  const { t } = useTranslation()

  return (
    <Modal
      noSize
      noBgColor
      isOpen={Boolean(props.isOpen)}
      className='h-full sm:h-auto sm:max-w-md shadow-3xl bg-new-modal'
      label={`Confirm Deposit Modal`}
      closeModal={props.closeModal}
    >
      <div className='relative text-inverse px-4 py-6 h-screen sm:h-auto rounded-none sm:rounded-sm mx-auto flex flex-col'>
        <div className='flex flex-col justify-center items-center pb-6'>
          <div className='text-xl font-bold mt-8 text-white'>{t('depositConfirmation')}</div>
          <div className='w-full mx-auto mt-8'>
            <TextInputGroup
              readOnly
              disabled
              symbolAndIcon={
                <TokenSymbolAndIcon chainId={chainId} address={tokenAddress} symbol={tokenSymbol} />
              }
              Input={RectangularInput}
              textClassName={'text-xl text-right'}
              className={'font-inter font-semibold opacity-100'}
              containerBgClassName={'bg-body'}
              containerRoundedClassName={'rounded-lg'}
              id='quantity-confirm-modal'
              name='quantity-confirm-modal'
              register={() => {}}
              value={quantity}
            />

            <DownArrow className='text-white' />

            <TextInputGroup
              readOnly
              disabled
              symbolAndIcon='PRZUSDC'
              Input={RectangularInput}
              roundedClassName={'rounded-lg'}
              containerRoundedClassName={'rounded-lg'}
              bgVarName='var(--color-bg-readonly-tsunami)'
              id='result-confirm-modal'
              name='result-confirm-modal'
              register={() => {}}
              value={quantity}
            />

            <div className='bg-light-purple-70 text-xxs font-inter font-semibold p-5 rounded-lg mt-10 text-white'>
              <div className='flex-col'>
                {/* <div className='flex justify-between'> */}
                {/* <div className=''>{t('winningOddsPerTicker', { ticker: 'PRZUSDC' })}</div> */}
                {/* <div className=''>{odds}</div> */}
                {/* </div> */}
                <div className='flex justify-between'>
                  <div className=''>{t('tickerToReceive', { ticker: 'PRZUSDC' })}</div>
                  <div className=''>{quantityFormatted}</div>
                </div>
              </div>
            </div>

            <button
              className='new-btn rounded-lg w-full text-xl py-2 mt-8'
              disabled={false}
              onClick={handleConfirmClick}
            >
              {t('confirmDeposit', 'Confirm deposit')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
