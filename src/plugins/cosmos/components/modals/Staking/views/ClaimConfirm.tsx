import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/layout'
import {
  Button,
  FormControl,
  ModalFooter,
  ModalHeader,
  Stack,
  Text as CText,
  Tooltip
} from '@chakra-ui/react'
import { CAIP10, CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
// @ts-ignore this will fail at 'file differs in casing' error
import { ChainAdapter as CosmosChainAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmosSdk/cosmos/CosmosChainAdapter'
import { FeeDataKey } from '@shapeshiftoss/types/dist/chain-adapters'
import { TxFeeRadioGroup } from 'plugins/cosmos/components/TxFeeRadioGroup/TxFeeRadioGroup'
import { FeePrice, getFormFees } from 'plugins/cosmos/utils'
import { useEffect, useMemo, useState } from 'react'
import { FormProvider, useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectRewardsAmountByAssetId
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ClaimPath, Field, StakingValues } from '../StakingCommon'

type ClaimConfirmProps = {
  assetId: CAIP19
  accountSpecifier: CAIP10
  validatorAddress: string
}

export const ClaimConfirm = ({
  assetId,
  accountSpecifier,
  validatorAddress
}: ClaimConfirmProps) => {
  const [feeData, setFeeData] = useState<FeePrice | null>(null)

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  const methods = useFormContext<StakingValues>()

  const { handleSubmit } = methods

  const { cosmosStaking } = useModal()
  const translate = useTranslate()
  const memoryHistory = useHistory()
  const chainAdapterManager = useChainAdapters()
  const adapter = chainAdapterManager.byChain(asset.chain) as CosmosChainAdapter

  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  useEffect(() => {
    ;(async () => {
      const feeData = await adapter.getFeeData({})

      const txFees = getFormFees(feeData, asset.precision, marketData.price)

      setFeeData(txFees)
    })()
  }, [adapter, asset.precision, marketData.price])

  const {
    state: { wallet }
  } = useWallet()

  const rewardsCryptoAmount = useAppSelector(state =>
    selectRewardsAmountByAssetId(state, accountSpecifier, validatorAddress, assetId)
  )

  const rewardsCryptoAmountPrecision = useMemo(
    () => bnOrZero(rewardsCryptoAmount).div(`1e+${asset.precision}`).toString(),
    [asset.precision, rewardsCryptoAmount]
  )
  const rewardsFiatAmountPrecision = useMemo(
    () => bnOrZero(rewardsCryptoAmountPrecision).times(marketData.price).toString(),
    [marketData, rewardsCryptoAmountPrecision]
  )

  const onSubmit = async ({ feeType }: { feeType: FeeDataKey }) => {
    if (!wallet || !feeData) return

    const fees = feeData[feeType]
    const gas = fees.chainSpecific.gasLimit

    methods.setValue(Field.GasLimit, gas)
    methods.setValue(Field.TxFee, fees.txFee)
    methods.setValue(Field.FiatFee, fees.fiatFee)
    methods.setValue(Field.CryptoAmount, rewardsCryptoAmount)

    memoryHistory.push(ClaimPath.Broadcast)
  }

  const handleCancel = () => {
    memoryHistory.goBack()
    cosmosStaking.close()
  }

  return (
    <FormProvider {...methods}>
      <SlideTransition>
        <Flex
          as='form'
          pt='14px'
          pb='18px'
          px='30px'
          onSubmit={handleSubmit(onSubmit)}
          direction='column'
          alignItems='center'
          justifyContent='space-between'
        >
          <ModalHeader textAlign='center'>
            <Amount.Fiat
              fontWeight='bold'
              fontSize='4xl'
              mb={-4}
              value={rewardsFiatAmountPrecision}
            />
          </ModalHeader>
          <Amount.Crypto
            color='gray.500'
            fontWeight='normal'
            fontSize='xl'
            value={rewardsCryptoAmountPrecision}
            symbol={asset.symbol}
          />
          <Flex mb='6px' mt='15px' width='100%'>
            <CText display='inline-flex' alignItems='center' color='gray.500'>
              {translate('defi.gasFee')}
              &nbsp;
              <Tooltip
                label={translate('defi.modals.staking.tooltip.gasFees', {
                  networkName: asset.name
                })}
              >
                <InfoOutlineIcon />
              </Tooltip>
            </CText>
          </Flex>
          <FormControl>
            <TxFeeRadioGroup asset={asset} mb='10px' fees={feeData} />
          </FormControl>
          <Text
            mt={1}
            width='100%'
            color='gray.500'
            fontSize={'sm'}
            translation='defi.modals.claim.rewardDepositInfo'
          />
          <ModalFooter width='100%' p='0' flexDir='column' textAlign='center' mt={10}>
            <Stack direction='row' width='full' justifyContent='space-between'>
              <Button
                onClick={handleCancel}
                size='lg'
                variant='ghost'
                backgroundColor='gray.700'
                fontWeight='normal'
              >
                <Text translation='common.cancel' mx={5} />
              </Button>
              <Button colorScheme={'blue'} mb={2} size='lg' type='submit' fontWeight='normal'>
                <Text translation={'defi.modals.claim.confirmAndClaim'} />
              </Button>
            </Stack>
          </ModalFooter>
        </Flex>
      </SlideTransition>
    </FormProvider>
  )
}
