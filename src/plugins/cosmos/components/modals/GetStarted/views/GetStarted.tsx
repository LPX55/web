import { Box, Flex } from '@chakra-ui/layout'
import { Button, ModalCloseButton, VStack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { DefiModalHeader } from 'plugins/cosmos/components/DefiModalHeader/DefiModalHeader'
import { useHistory, useLocation } from 'react-router-dom'
import osmosis from 'assets/osmosis.svg'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type GetStartedProps = {
  assetId: CAIP19
}

// TODO: Abstract me in a service when I start to get too big
const ASSET_ID_TO_MAX_APR: Record<CAIP19, string> = {
  'cosmos:cosmoshub-4/slip44:118': '12'
}

const SHAPESHIFT_VALIDATOR_ADDRESS = 'cosmosvaloper199mlc7fr6ll5t54w7tts7f4s0cvnqgc59nmuxf'

export const GetStarted = ({ assetId }: GetStartedProps) => {
  const { cosmosGetStarted, cosmosStaking } = useModal()
  const history = useHistory()
  const location = useLocation()
  const handleLearnMoreClick = () => {
    history.push({
      pathname: `/defi/modal/learn-more`,
      state: { background: location }
    })
  }

  const handleStartStakingClick = () => {
    cosmosStaking.open({
      assetId,
      validatorAddress: SHAPESHIFT_VALIDATOR_ADDRESS
    })
    cosmosGetStarted.close()
  }

  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const maxApr = ASSET_ID_TO_MAX_APR[assetId]

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Box pt='51px' pb='20px' px='24px'>
        <ModalCloseButton borderRadius='full' />
        <Flex
          direction='column'
          maxWidth='395px'
          alignItems='center'
          justifyContent='space-between'
        >
          <DefiModalHeader
            headerImageSrc={osmosis}
            headerImageMaxWidth={68}
            headerText={['defi.modals.getStarted.header', { assetName: asset.name, maxApr }]}
          />
          <Box textAlign='center'>
            <Text
              translation='defi.modals.getStarted.body'
              color='gray.500'
              fontWeight='semibold'
            />
          </Box>

          <Box width='100%'>
            <Box textAlign='center' pb='16px'>
              <Text
                translation='defi.modals.getStarted.userProtectionInfo'
                color='gray.500'
                fontSize='13px'
                mt='32px'
              />
            </Box>
            <VStack spacing={4} align='center' width='100%'>
              <Button
                size='lg'
                zIndex={1}
                width='100%'
                colorScheme='blue'
                onClick={handleStartStakingClick}
              >
                <Text translation='defi.modals.getStarted.cta.startStaking' />
              </Button>
              <Button
                size='lg'
                zIndex={1}
                variant='ghost'
                colorScheme='white'
                onClick={handleLearnMoreClick}
              >
                <Text translation='defi.modals.getStarted.cta.learnMore' />
              </Button>
            </VStack>
          </Box>
        </Flex>
      </Box>
    </AnimatePresence>
  )
}
