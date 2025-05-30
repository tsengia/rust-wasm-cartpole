import { Flex, Skeleton, Text, TextField } from "@radix-ui/themes";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import useCartpoleAppState from '../AppState';
import { EpisodeData } from "../worker/WorkerInterface";

export const CART_WIDTH = 50;
export const CART_HEIGHT = 30;
export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 200;

function EpisodeReplay() {

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const context = useRef<CanvasRenderingContext2D | null>(null);
    const animationInterval = useRef<number>(null);
    const autoPlayStarted = useRef<boolean>(false);
    
    const [endOfReplay, setEndOfReplay] = useState(false);
    const [paused, setPaused] = useState(false);
    const [frame, setFrame] = useState(0);

    const episodes: EpisodeData[] = useCartpoleAppState((state)=> state.episodes);
    const [episodeID, setEpisodeID] = useState<number>(0);

    const episode = useMemo<EpisodeData | null>(()=>{
            if (episodeID == null || episodes.length == 0) {
                return null;
            }

            if (episodeID < 0 || episodeID >= episodes.length) {
                return null;
            }
            return episodes[episodeID];
        }, [episodeID, episodes]);
    
    const stopReplay = useCallback(() => {
        if (animationInterval.current !== null) {
            clearInterval(animationInterval.current);
            animationInterval.current = null;
        }
    }, [animationInterval]);

    const animationCallback = useCallback(() => {
        if (episode == null) {
            return;
        }

        setFrame(f => {
            if (f + 1 >= episode.total_steps) {
                // Reached the end of the replay
                console.log("Reached end of the replay!");
                stopReplay();
                setEndOfReplay(true);
            }
            return f+1;
        });
    }, [episode, stopReplay]);

    const startReplay = useCallback(() => {
        console.log("Called startReplay!");
        animationInterval.current = window.setInterval(animationCallback, 15);
        setEndOfReplay(false);
    }, [animationCallback]);

    const restartReplay = useCallback(() => {
        stopReplay();
        setFrame(0);
        startReplay();
    },[startReplay, stopReplay]);

    const handleClick = useCallback(() => {
        if (endOfReplay) {
            console.log("Restarting replay!");
            restartReplay();
        }
        else if (paused) {
            console.log("Resuming replay!");
            startReplay();
            setPaused(false);
        }
        else {
            console.log("Pausing replay!");
            stopReplay();
            setPaused(true);
        }
    }, [paused, endOfReplay, startReplay, restartReplay, stopReplay]);
    
    if (!autoPlayStarted.current && !endOfReplay && !paused && episode != null && animationInterval.current == null) {
        // Just got new episodes, start auto-playing
        autoPlayStarted.current = true;
        startReplay();
    }

    useEffect(()=> {
        if (episode == null) {
            return;
        }
        if (context.current == null) {
            const canvas_obj = canvasRef.current;
            if (canvas_obj !== null) {
                context.current = canvas_obj.getContext("2d");
                console.log("Set 2D context");
            }
        }

        if (context === null || context.current === null) {
            console.error("effect context is null!");
            return;
        }


        const ctx = context.current;
        const f = frame;
        const cart_x = episode.cart_positions[f] + (CANVAS_WIDTH/2);
        const cart_y = CANVAS_HEIGHT / 2 - CART_HEIGHT / 2;
        const pole_end_x = (cart_x+CART_WIDTH/2) + Math.cos(episode.pole_angles[f]) * (2*CART_HEIGHT);
        const pole_end_y = (cart_y+CART_HEIGHT/2) - Math.sin(episode.pole_angles[f]) * (2*CART_HEIGHT);

        // Clear the canvas
        ctx.fillStyle = "#FFF";
        ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw the ID numbers
        ctx.fillStyle = "#000";
        ctx.font = "30px sans-serif";
        ctx.fillText("Frame: " + f + "/" + episode.total_steps, 5, 30);

        // Draw the pole
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 10;
        ctx.moveTo(cart_x+CART_WIDTH/2, cart_y+CART_HEIGHT/2);
        ctx.beginPath();
        ctx.moveTo(cart_x+CART_WIDTH/2, cart_y+CART_HEIGHT/2);
        ctx.lineTo(pole_end_x, pole_end_y);
        ctx.stroke();

        // Draw the cart
        ctx.fillStyle = "#F00";
        ctx.fillRect(cart_x, cart_y, CART_WIDTH, CART_HEIGHT);

        if (paused || endOfReplay) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "#999";
            ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.globalAlpha = 1.0;

            ctx.fillStyle = "#000";
            ctx.lineWidth = 1;
            let msg: string = "";
            if (endOfReplay) {
                msg = "End of Replay. Click to play again."
            }
            else if (paused) {
                msg = "Replay Paused. Click to resume.";
            }
            ctx.fillText(msg, CANVAS_WIDTH/2 - 200, CANVAS_HEIGHT/2);
        }
    }, [paused, frame, episode, endOfReplay, startReplay]);

    return (
        <Flex direction='column' gap='4' >
            <Flex direction='row' gap='4' >
            <Text as="label" >
                Epoch: 0
            </Text>
            <Text as="label" >
                Episode: <TextField.Root style={{display:'inline-block'}} defaultValue={episodeID} onChange={(e)=>{if (!Number.isNaN(parseInt(e.target.value))) { const i = parseInt(e.target.value); if (i<episodes.length) {setEpisodeID(i); restartReplay();}} }} /> / {episodes.length}
            </Text>

            </Flex>
            <Skeleton loading={episode == null} height={CANVAS_HEIGHT + "px"} width={CANVAS_WIDTH + "px"} >
                <canvas ref={canvasRef} height={CANVAS_HEIGHT + "px"} width={CANVAS_WIDTH + "px"} onClick={handleClick}></canvas>
            </Skeleton>
        </Flex>        
    );
}

export default EpisodeReplay;
