import { InfoOutlineIcon } from '@chakra-ui/icons'
import { Flex, Link } from '@chakra-ui/layout'
import {
  Button,
  FormControl,
  ModalFooter,
  ModalHeader,
  Stack,
  Text as CText,
  Tooltip
} from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
// @ts-ignore this will fail at 'file differs in casing' error
import { ChainAdapter as CosmosChainAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmosSdk/cosmos/CosmosChainAdapter'
import { FeeDataKey } from '@shapeshiftoss/types/dist/chain-adapters'
import { TxFeeRadioGroup } from 'plugins/cosmos/components/TxFeeRadioGroup/TxFeeRadioGroup'
import { getFormFees } from 'plugins/cosmos/utils'
import { FeePrice } from 'plugins/cosmos/utils'
import { useEffect, useMemo, useState } from 'react'
import { FormProvider, useFormContext, useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectSingleValidator
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { Field, StakingValues, UnstakingPath } from '../StakingCommon'

type UnstakeProps = {
  assetId: CAIP19
  accountSpecifier: string
  validatorAddress: string
  onCancel: () => void
}

export const UnstakeConfirm = ({
  assetId,
  accountSpecifier,
  validatorAddress,
  onCancel
}: UnstakeProps) => {
  const [feeData, setFeeData] = useState<FeePrice | null>(null)

  const methods = useFormContext<StakingValues>()
  const { handleSubmit, control } = methods
  const { cryptoAmount } = useWatch({ control })

  const validatorInfo = useAppSelector(state =>
    selectSingleValidator(state, accountSpecifier, validatorAddress)
  )
  const {
    state: { wallet }
  } = useWallet()

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const chainAdapterManager = useChainAdapters()
  const adapter = chainAdapterManager.byChain(asset.chain) as CosmosChainAdapter

  const fiatUnstakeAmount = useMemo(
    () => bnOrZero(cryptoAmount).times(marketData.price).toString(),
    [cryptoAmount, marketData.price]
  )

  useEffect(() => {
    ;(async () => {
      const feeData = await adapter.getFeeData({})

      const txFees = getFormFees(feeData, asset.precision, marketData.price)

      setFeeData(txFees)
    })()
  }, [adapter, asset.precision, marketData.price])

  const history = useHistory()
  const onSubmit = async ({ feeType }: { feeType: FeeDataKey }) => {
    if (!wallet || !feeData) return

    const fees = feeData[feeType]
    const gas = fees.chainSpecific.gasLimit

    methods.setValue(Field.GasLimit, gas)
    methods.setValue(Field.TxFee, fees.txFee)
    methods.setValue(Field.FiatFee, fees.fiatFee)

    history.push(UnstakingPath.Broadcast)
  }

  const translate = useTranslate()

  if (!cryptoAmount) return null

  return (
    <FormProvider {...methods}>
      <SlideTransition>
        <Flex
          as='form'
          pt='14px'
          pb='18px'
          px='30px'
          onSubmit={handleSubmit(onSubmit)}
          flexDirection='column'
          alignItems='center'
          justifyContent='space-between'
        >
          <ModalHeader textAlign='center'>{translate('defi.confirmDetails')}</ModalHeader>
          <Flex width='100%' mb='20px' justifyContent='space-between'>
            <Text color='gray.500' translation={'defi.unstake'} />
            <Flex flexDirection='column' alignItems='flex-end'>
              <Amount.Fiat fontWeight='semibold' value={fiatUnstakeAmount} />
              <Amount.Crypto color='gray.500' value={cryptoAmount} symbol={asset.symbol} />
            </Flex>
          </Flex>
          <Flex width='100%' mb='30px' justifyContent='space-between'>
            <CText display='inline-flex' alignItems='center' color='gray.500'>
              {translate('defi.unstakeFrom')}
              &nbsp;
              <Tooltip label={translate('defi.modals.staking.tooltip.validator')}>
                <InfoOutlineIcon />
              </Tooltip>
            </CText>
            <Link
              color={'blue.200'}
              target='_blank'
              href={`https://www.mintscan.io/cosmos/validators/${validatorAddress}`}
            >
              {validatorInfo.moniker}
            </Link>
          </Flex>
          <Flex mb='6px' width='100%'>
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
            <TxFeeRadioGroup asset={asset} fees={feeData} />
          </FormControl>
          <ModalFooter width='100%' py='0' px='0' flexDir='column' textAlign='center' mt={1}>
            <Text
              textAlign='left'
              fontSize='sm'
              color='gray.500'
              translation={['defi.unbondInfoItWillTakeShort', { unbondingDays: '21' }]}
              mb='18px'
            />
            <Stack direction='row' width='full' justifyContent='space-between'>
              <Button onClick={onCancel} size='lg' variant='ghost'>
                <Text translation='common.cancel' />
              </Button>
              <Button colorScheme={'blue'} mb={2} size='lg' type='submit'>
                <Text translation={'defi.signAndBroadcast'} />
              </Button>
            </Stack>
          </ModalFooter>
        </Flex>
      </SlideTransition>
    </FormProvider>
  )
}
