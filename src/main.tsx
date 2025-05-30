import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import { ThemeProvider } from "next-themes";
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import EpisodeReplay from './components/EpisodeReplay.tsx';
import MetricsPanel from './components/MetricsPanel.tsx';
import ControlsPanel from './components/ControlsPanel.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
		<ThemeProvider attribute="class">
      <Theme>
        <PanelGroup id="top-panel" direction='horizontal' >
          <Panel defaultSize={80}>
            <PanelGroup direction='vertical' >
              
              <Panel id="replay-panel" className="panel" defaultSize={50} >
                <EpisodeReplay />
              </Panel>

              <PanelResizeHandle className='resize-handle' />

              <Panel id="metrics-panel" defaultSize={50} >
                <MetricsPanel />
              </Panel>

            </PanelGroup>
          </Panel>

          <PanelResizeHandle className='resize-handle'  />
          
          <Panel id="controls-panel" className="panel" defaultSize={20} >            
              <ControlsPanel />
          </Panel>
        </PanelGroup>
      </Theme>
    </ThemeProvider>
  </StrictMode>
)

