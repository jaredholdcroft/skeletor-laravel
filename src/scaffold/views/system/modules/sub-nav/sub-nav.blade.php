{{-- -----------------------------------
  -- module: sub-nav
  -- -----------------------------------
  --}}

<nav class="sub-nav">
	@for ($i = 1; $i <= 5; $i++)
		<a class="sub-nav__link" href="#">Sub Link {{ $i }}</a>
	@endfor
</nav>
