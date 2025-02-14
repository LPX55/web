import { Box, Button, Center, Link, ModalBody, ModalFooter, Stack } from '@chakra-ui/react'
import { AssetNamespace, AssetReference, CAIP19, caip19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import isNil from 'lodash/isNil'
import { useEffect, useState } from 'react'
import { FaCheck, FaTimes } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { TransactionReceipt } from 'web3-core/types'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { IconCircle } from 'components/IconCircle'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { poll } from 'lib/poll/poll'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

interface ClaimStatusState {
  txid: string
  assetId: CAIP19
  amount: string
  userAddress: string
  estimatedGas: string
  usedGasFee?: string
  status: string
  chain: ChainTypes
}

enum TxStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed'
}

type ClaimState = {
  txStatus: TxStatus
  usedGasFee?: string
}

const StatusInfo = {
  [TxStatus.PENDING]: {
    text: 'defi.broadcastingTransaction',
    color: 'blue.500'
  },
  [TxStatus.SUCCESS]: {
    text: 'defi.transactionComplete',
    color: 'green.500',
    icon: <FaCheck />
  },
  [TxStatus.FAILED]: {
    text: 'defi.transactionFailed',
    color: 'red.500',
    icon: <FaTimes />
  }
}

export const ClaimStatus = () => {
  const { history: browserHistory } = useBrowserRouter()
  const { foxy } = useFoxy()
  const translate = useTranslate()
  const {
    state: { txid, amount, assetId, userAddress, estimatedGas, chain }
  } = useLocation<ClaimStatusState>()
  const [state, setState] = useState<ClaimState>({
    txStatus: TxStatus.PENDING
  })

  // Asset Info
  const network = NetworkTypes.MAINNET
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const feeAssetCAIP19 = caip19.toCAIP19({
    chain,
    network,
    assetNamespace: AssetNamespace.Slip44,
    assetReference: AssetReference.Ethereum
  })
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetCAIP19))
  const feeMarketData = useAppSelector(state => selectMarketDataById(state, feeAssetCAIP19))

  useEffect(() => {
    ;(async () => {
      if (!foxy || !txid) return
      try {
        const transactionReceipt = await poll({
          fn: () => foxy.getTxReceipt({ txid }),
          validate: (result: TransactionReceipt) => !isNil(result),
          interval: 15000,
          maxAttempts: 30
        })
        const gasPrice = await foxy.getGasPrice()
        setState({
          ...state,
          txStatus: transactionReceipt.status === true ? TxStatus.SUCCESS : TxStatus.FAILED,
          usedGasFee: bnOrZero(gasPrice).times(transactionReceipt.gasUsed).toFixed(0)
        })
      } catch (error) {
        console.error('FoxyClaim:useEffect error:', error)
        setState({
          ...state,
          txStatus: TxStatus.FAILED,
          usedGasFee: estimatedGas
        })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SlideTransition>
      <ModalBody>
        <Center py={8} flexDirection='column'>
          <CircularProgress
            size='24'
            position='relative'
            thickness='4px'
            isIndeterminate={state.txStatus === TxStatus.PENDING}
          >
            <Box position='absolute' top='50%' left='50%' transform='translate(-50%, -50%)'>
              {state.txStatus === TxStatus.PENDING ? (
                <AssetIcon src={asset?.icon} boxSize='16' />
              ) : (
                <IconCircle bg={StatusInfo[state.txStatus].color} boxSize='16' color='white'>
                  {StatusInfo[state.txStatus].icon}
                </IconCircle>
              )}
            </Box>
          </CircularProgress>
          <RawText mt={6} fontWeight='medium'>
            {translate(
              state.txStatus === TxStatus.PENDING
                ? 'defi.broadcastingTransaction'
                : 'defi.transactionComplete'
            )}
          </RawText>
        </Center>
      </ModalBody>
      <ModalFooter>
        <Stack width='full' spacing={4}>
          <Row>
            <Row.Label>{translate('modals.status.transactionId')}</Row.Label>
            <Row.Value>
              <Link isExternal color='blue.500' href={`${asset?.explorerTxLink}${txid}`}>
                <MiddleEllipsis address={txid} />
              </Link>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>{translate('defi.modals.claim.claimAmount')}</Row.Label>
            <Row.Value>
              <Amount.Crypto
                value={bnOrZero(amount).div(`1e+${asset.precision}`).toString()}
                symbol={asset?.symbol}
              />
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>{translate('defi.modals.claim.claimToAddress')}</Row.Label>
            <Row.Value>
              <Link
                isExternal
                color='blue.500'
                // TODO:(ryankk) create explorer links given a link template and a value
                href={`${asset?.explorerAddressLink}${userAddress}`}
              >
                <MiddleEllipsis address={userAddress} />
              </Link>
            </Row.Value>
          </Row>
          <Row>
            <Row.Label>
              {translate(
                state.txStatus === TxStatus.PENDING
                  ? 'modals.status.estimatedGas'
                  : 'modals.status.gasUsed'
              )}
            </Row.Label>
            <Row.Value>
              <Stack textAlign='right' spacing={0}>
                <Amount.Fiat
                  fontWeight='bold'
                  value={bnOrZero(
                    state.txStatus === TxStatus.PENDING ? estimatedGas : state.usedGasFee
                  )
                    .div(`1e+${feeAsset.precision}`)
                    .times(feeMarketData.price)
                    .toFixed(2)}
                />
                <Amount.Crypto
                  color='gray.500'
                  value={bnOrZero(
                    state.txStatus === TxStatus.PENDING ? estimatedGas : state.usedGasFee
                  )
                    .div(`1e+${feeAsset.precision}`)
                    .toFixed(5)}
                  symbol='ETH'
                />
              </Stack>
            </Row.Value>
          </Row>
          <Button isFullWidth size='lg' onClick={() => browserHistory.goBack()}>
            {translate('common.close')}
          </Button>
        </Stack>
      </ModalFooter>
    </SlideTransition>
  )
}
