const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const { authMiddleware } = require('./auth');

// Get all parties (for joining)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: parties, error } = await supabase.from('parties').select('*');
    if (error) throw error;
    
    const allMemberIds = [...new Set(parties.flatMap(p => p.members))];
    const { data: characters, error: charsError } = await supabase
      .from('characters')
      .select('id, name, class, level')
      .in('id', allMemberIds.length > 0 ? allMemberIds : ['00000000-0000-0000-0000-000000000000']);
      
    if (charsError) throw charsError;
    
    const charMap = {};
    characters?.forEach(c => charMap[c.id] = c);
    
    const populated = parties.map(p => ({
      ...p,
      leader: charMap[p.leader_id] || null,
      members: p.members.map(id => charMap[id]).filter(Boolean)
    }));
    
    res.json(populated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a party
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, characterId } = req.body;
    if (!name || !characterId) return res.status(400).json({ error: 'Name and characterId required' });

    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', req.user.id)
      .maybeSingle();
      
    if (charError) throw charError;
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const { data: existing, error: existError } = await supabase
      .from('parties')
      .select('id')
      .eq('name', name)
      .maybeSingle();
      
    if (existError) throw existError;
    if (existing) return res.status(400).json({ error: 'Party name already taken' });

    const { data: party, error: insertError } = await supabase
      .from('parties')
      .insert({
        name,
        leader_id: characterId,
        members: [characterId]
      })
      .select()
      .single();
      
    if (insertError) throw insertError;
    res.status(201).json(party);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join a party
router.post('/:partyId/join', authMiddleware, async (req, res) => {
  try {
    const { characterId } = req.body;
    
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', req.user.id)
      .maybeSingle();
      
    if (charError) throw charError;
    if (!character) return res.status(404).json({ error: 'Character not found' });

    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('*')
      .eq('id', req.params.partyId)
      .maybeSingle();
      
    if (partyError) throw partyError;
    if (!party) return res.status(404).json({ error: 'Party not found' });
    if (party.members.length >= party.max_members) return res.status(400).json({ error: 'Party is full' });
    if (party.members.includes(characterId)) return res.status(400).json({ error: 'Already in party' });

    const newMembers = [...party.members, characterId];
    
    const { data: updatedParty, error: updateError } = await supabase
      .from('parties')
      .update({ members: newMembers })
      .eq('id', party.id)
      .select()
      .single();
      
    if (updateError) throw updateError;
    res.json(updatedParty);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Leave a party
router.post('/:partyId/leave', authMiddleware, async (req, res) => {
  try {
    const { characterId } = req.body;
    
    const { data: party, error: partyError } = await supabase
      .from('parties')
      .select('*')
      .eq('id', req.params.partyId)
      .maybeSingle();
      
    if (partyError) throw partyError;
    if (!party) return res.status(404).json({ error: 'Party not found' });

    const newMembers = party.members.filter(id => id !== characterId);

    if (newMembers.length === 0) {
      await supabase.from('parties').delete().eq('id', party.id);
      return res.json({ message: 'Party disbanded (empty)' });
    }

    let newLeaderId = party.leader_id;
    if (party.leader_id === characterId && newMembers.length > 0) {
      newLeaderId = newMembers[0];
    }

    const { data: updatedParty, error: updateError } = await supabase
      .from('parties')
      .update({ members: newMembers, leader_id: newLeaderId })
      .eq('id', party.id)
      .select()
      .single();
      
    if (updateError) throw updateError;
    res.json(updatedParty);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
