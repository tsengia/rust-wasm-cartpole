import { Flex, Skeleton, Text, TextField } from "@radix-ui/themes";
import { BatchedEpisodeRecord, EpisodeRecording } from "burn-polecart-wasm";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import useCartpoleAppState from '../AppState';

export const CART_WIDTH = 50;
export const CART_HEIGHT = 30;
export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 200;

function EpisodeReplay() {

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const context = useRef<CanvasRenderingContext2D | null>(null);
    //const episodeIdRef = useRef<number | null>(null);
    const animationInterval = useRef<number>(null);
    
    const [paused, setPaused] = useState(false);
    const [frame, setFrame] = useState(0);
   
    const episodeBatch: BatchedEpisodeRecord | null = useCartpoleAppState((state)=> state.episodes);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [episodeID, _] = useState<number>(0); // setEpisodeID

    const episode = useMemo<EpisodeRecording | null>(
        ()=>{
            //console.log(episodeBatch);
            if (episodeID == null || episodeBatch == null) {
                return null;
            }

            if (episodeID < 0 || episodeID >= episodeBatch.episode_count) {
                return null;
            }

            return episodeBatch.get_episode(episodeID);
        },
        [episodeID, episodeBatch]);

    if (context.current == null) {
        const canvas_obj = canvasRef.current;
        if (canvas_obj !== null) {
            context.current = canvas_obj.getContext("2d");
        }
    }
    
    const stopReplay = useCallback(() => {
        if (animationInterval.current !== null) {
            clearInterval(animationInterval.current);
            animationInterval.current = null;
        }
    },[animationInterval]);

    const animationCallback = useCallback(() => {
        if (episodeBatch == null) {
            return;
        }

        setFrame(f => {
            if (f + 1 >= episodeBatch.total_steps) {
                // Reached the end of the replay
                stopReplay();
            }
            return f+1;
        });
    }, [episodeBatch, stopReplay]);

    const startReplay = useCallback(() => {
        animationInterval.current = window.setInterval(animationCallback, 15);
    }, [animationCallback]);

    const restartReplay = useCallback(() => {
        stopReplay();
        startReplay();
        setFrame(0);
    },[startReplay, stopReplay]);

    const handleClick = useCallback(() => {
        if (!paused) {
            restartReplay();
            setPaused(false);
        }
        else if (animationInterval.current === null) {
            startReplay();
            setPaused(false);
        }
        else {
            stopReplay();
            setPaused(true);
        }
    }, [paused, startReplay, restartReplay, stopReplay]);

    /*
        TODO: The rendering loop should not be state updates.
        The rendering loop should be outside of react's control.
    */

    /* if (episode != null) {
        endOfReplay = frame + 1 >= episode.cart_positions.length;
    }
    else {
        endOfReplay = false;
    }
    
    useEffect(() => {
        if (episodeIdRef.current === null) {
            episodeIdRef.current = episode_id;
            startReplay();
        }
        else if (episodeIdRef.current != episode_id) {
            episodeIdRef.current = episode_id;
            restartReplay();
        }
        
    }, [episode, episode_id, restartReplay, startReplay]);
    */
    
    useEffect(()=> {
        if (episode == null || episodeBatch == null) {
            return;
        }

        if (context === null || context.current === null) {
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
        ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw the ID numbers
        ctx.fillStyle = "#000";
        ctx.font = "30px sans-serif";
        ctx.fillText("Frame: " + f + "/" + episodeBatch.total_steps, 5, 75);

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

        if (paused) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "#999";
            ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.globalAlpha = 1.0;

            ctx.fillStyle = "#000";
            ctx.lineWidth = 1;
            let msg: string = "";
            // if (endOfReplay) {
            //     msg = "End of Replay. Click to play again."
            // }
            if (paused) {
                msg = "Replay Paused. Click to resume.";
            }
            ctx.fillText(msg, CANVAS_WIDTH/2 - 200, CANVAS_HEIGHT/2);
        }
    },[paused, frame, episodeBatch, episode]);

    return (
        <Flex direction='column' gap='4' >
            <Flex direction='row' gap='4' >
            <Text as="label" >
                Epoch: 0
            </Text>
            <Text as="label" >
                Episode: <TextField.Root style={{display:'inline-block'}} defaultValue="1" placeholder="Value between 0 and 127" />
            </Text>

            </Flex>
            <Skeleton loading={episodeBatch == null} height={CANVAS_HEIGHT + "px"} width={CANVAS_WIDTH + "px"} >
                <canvas ref={canvasRef} height={CANVAS_HEIGHT + "px"} width={CANVAS_WIDTH + "px"} onClick={handleClick}></canvas>
            </Skeleton>
        </Flex>        
    );
}

export default EpisodeReplay;
