import { chakra, Text, Link, Button, VStack, HStack } from '@chakra-ui/react'
import React, { useCallback } from 'react'

const DONATE_HREF =
  'https://commerce.coinbase.com/checkout/247b6ffe-fb4e-47a8-9a76-e6b7ef83ea22'

export const Footer: React.FC = () => {
  const handleDonate = useCallback(() => {
    window.location.href = DONATE_HREF
  }, [])

  return (
    <chakra.footer textAlign="center" textStyle="footer" paddingY="10px">
      <VStack spacing="4px">
        <HStack>
          <Text>
            <strong>Like FilePizza?</strong> Support its development!{' '}
          </Text>
          <Button size="xs" onClick={handleDonate}>
            donate
          </Button>
        </HStack>

        <Text>
          Cooked up by{' '}
          <Link textStyle="footerLink" href="http://kern.io" isExternal>
            Alex Kern
          </Link>{' '}
          &amp;{' '}
          <Link textStyle="footerLink" href="http://neeraj.io" isExternal>
            Neeraj Baid
          </Link>{' '}
          while eating <strong>Sliver</strong> @ UC Berkeley &middot;{' '}
          <Link
            textStyle="footerLink"
            href="https://github.com/kern/filepizza#faq"
            isExternal
          >
            FAQ
          </Link>{' '}
          &middot;{' '}
          <Link
            textStyle="footerLink"
            href="https://github.com/kern/filepizza"
            isExternal
          >
            Fork us
          </Link>
        </Text>
      </VStack>
    </chakra.footer>
  )
}

export default Footer
