UPDATE public.invitation_content 
SET hero_intro = 'You are cordially invited to attend a very special evening of association, cultural enrichment, gift exchanges, making new friends, seeing long-time friends, and making wonderful memories.

We will have entertainment by talented brothers and sisters as we travel to conventions worldwide- on this side of paradise! 

For details, see the video.'
WHERE hero_intro IS NOT NULL;