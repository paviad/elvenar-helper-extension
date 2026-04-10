import React from 'react';
import { Typography, Box, Divider, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AssessmentIcon from '@mui/icons-material/Assessment'; // For stats/analysis
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'; // For resale/value
import GroupWorkIcon from '@mui/icons-material/GroupWork'; // For grouping/aggregation

export const InventoryManager = () => (
  <Box>
    <Typography variant='h4' gutterBottom>
      Inventory Manager Guide
    </Typography>
    <Typography component="p" variant="body1" gutterBottom>
      The Inventory Manager transforms your cluttered inventory into a powerful, searchable database. It helps you make
      informed decisions about what to place, what to keep, and what to disenchant.
    </Typography>

    <Divider sx={{ my: 2 }} />

    {/* Search & Filter */}
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <SearchIcon color='primary' fontSize='small' /> Finding Items
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Smart Search'
          secondary="Filter your inventory instantly by typing part of a name (e.g., 'Unicorn') or a building type."
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Type Filtering'
          secondary="Use the dropdown menu to see only specific categories of items, such as 'Items' or 'Buildings'."
        />
      </ListItem>
    </List>

    <Box mt={2} />

    {/* Building Stats */}
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <AssessmentIcon color='primary' fontSize='small' /> Building Statistics
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Production & Provisions'
          secondary='The table displays exactly what each building provides (Population, Culture) and produces (Mana, Seeds, Orcs, etc.).'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Per Square Analysis'
          secondary="Toggle the 'Show per square' switch to normalize values. This is crucial for efficiency comparison—seeing which building gives the most Population per tile is often more important than the raw total."
        />
      </ListItem>
    </List>

    <Box mt={2} />

    {/* Aggregation */}
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <GroupWorkIcon color='primary' fontSize='small' /> Aggregation
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Group by Name'
          secondary="Toggle 'Aggregate by Name' to combine multiple items of the same type (e.g., if you have 5 'Mana Huts' across different chapters). This shows you the total potential output of all copies combined."
        />
      </ListItem>
    </List>

    <Box mt={2} />

    {/* Resale & Disenchanting */}
    <Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <MonetizationOnIcon color='primary' fontSize='small' /> Value Analysis
    </Typography>
    <List dense disablePadding>
      <ListItem>
        <ListItemText
          primary='Resale Value (CC & RR)'
          secondary='See at a glance which event buildings can be sold to the Magic Academy for valuable Combining Catalysts (CC) or Royal Restoration (RR) spells.'
        />
      </ListItem>
      <ListItem>
        <ListItemText
          primary='Disenchant Value'
          secondary="The 'Spell Fragments' column shows exactly how many fragments you will gain by disenchanting an item, helping you quickly identify low-value fodder for crafting."
        />
      </ListItem>
    </List>
  </Box>
);
