import { Box, Tabs, Text } from '@radix-ui/themes';


function MetricsPanel() {
  return (<Tabs.Root defaultValue="loss">
    <Tabs.List>
      <Tabs.Trigger value="loss">Loss</Tabs.Trigger>
      <Tabs.Trigger value="documents">Documents</Tabs.Trigger>
      <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
    </Tabs.List>

    <Box pt="3">
      <Tabs.Content value="loss">
        <Text size="2">Loss VS Epoch chart should be displayed here.</Text>
      </Tabs.Content>

      <Tabs.Content value="documents">
        <Text size="2">Access and update your documents.</Text>
      </Tabs.Content>

      <Tabs.Content value="settings">
        <Text size="2">Edit your profile or update contact information.</Text>
      </Tabs.Content>
    </Box>
  </Tabs.Root>);
}

export default MetricsPanel
