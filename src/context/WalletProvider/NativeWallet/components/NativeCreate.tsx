import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Code,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tag,
  Wrap
} from '@chakra-ui/react'
import * as native from '@shapeshiftoss/hdwallet-native'
import { GENERATE_MNEMONIC, Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { range } from 'lodash'
import { Component, useEffect, useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { Text } from 'components/Text'

import { NativeSetupProps } from '../types'

const getVault = async (): Promise<Vault> => {
  const vault = await Vault.create(undefined, false)
  vault.meta.set('createdAt', Date.now())
  vault.set('#mnemonic', GENERATE_MNEMONIC)
  return vault
}

const Revocable = native.crypto.Isolation.Engines.Default.Revocable
const revocable = native.crypto.Isolation.Engines.Default.revocable

export const NativeCreate = ({ history, location }: NativeSetupProps) => {
  const [revealed, setRevealed] = useState<boolean>(false)
  const revealedOnce = useRef<boolean>(false)
  const handleShow = () => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }
  const [vault, setVault] = useState<Vault | null>(null)
  const [words, setWords] = useState<Component[] | null>(null)
  const [revoker] = useState(new (Revocable(class {}))())

  const placeholders = useMemo(() => {
    return range(1, 13).map(i => (
      <Tag
        p={2}
        flexBasis='31%'
        justifyContent='flex-start'
        fontSize='md'
        colorScheme='blue'
        key={i}
      >
        <Code mr={2}>{i}</Code>
        •••••••
      </Tag>
    ))
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const vault = await getVault()
        setVault(vault)
      } catch (e) {
        // @TODO
        console.error(e)
      }
    })()
  }, [setVault])

  useEffect(() => {
    if (!vault) return
    ;(async () => {
      try {
        setWords(
          (await vault.unwrap().get('#mnemonic')).split(' ').map((word: string, index: number) =>
            revocable(
              <Tag
                p={2}
                flexBasis='31%'
                justifyContent='flex-start'
                fontSize='md'
                key={word}
                colorScheme='blue'
              >
                <Code mr={2}>{index + 1}</Code>
                {word}
              </Tag>,
              revoker.addRevoker.bind(revocable)
            )
          )
        )
      } catch (e) {
        console.error('failed to get Secret Recovery Phrase:', e)
        setWords(null)
      }
    })()

    return () => {
      revoker.revoke()
    }
  }, [setWords, vault, revoker])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.create.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'walletProvider.shapeShift.create.body'} />
        {location?.state?.error && (
          <Alert status='error'>
            <AlertIcon />
            <AlertDescription>{location.state.error.message}</AlertDescription>
          </Alert>
        )}
        <Wrap mt={12} mb={6}>
          {revealed ? words : placeholders}
        </Wrap>
      </ModalBody>
      <ModalFooter justifyContent='space-between'>
        <Button colorScheme='blue' variant='ghost' onClick={handleShow} leftIcon={<FaEye />}>
          <Text
            translation={`walletProvider.shapeShift.create.${revealed ? 'hide' : 'show'}Words`}
          />
        </Button>
        <Button
          colorScheme='blue'
          size='lg'
          disabled={!(vault && words && revealedOnce.current)}
          onClick={() => {
            if (vault) {
              history.push('/native/create-test', { vault })
            }
          }}
        >
          <Text translation={'walletProvider.shapeShift.create.button'} />
        </Button>
      </ModalFooter>
    </>
  )
}
